import { randomUUID } from "node:crypto";
import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";
import { normalize } from "@/lib/documents/br-financial-format";
import type { Database, Json } from "@/types/database";

// Tipado só via `@supabase/supabase-js` (não `lib/supabase/server.ts`) de
// propósito: este módulo não cria seu próprio client (recebe um já pronto do
// chamador), e importar `server.ts` puxaria `next/headers` — o que quebraria
// os testes unitários das funções puras abaixo sem nenhum ganho real.
type SupabaseClient = SupabaseJsClient<Database>;
type ReconciliationRelationType = Database["public"]["Enums"]["reconciliation_relation_type"];
type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];
type TransactionType = Database["public"]["Enums"]["transaction_type"];

/**
 * Fase 2 — Macrofase 7 (PRD 2.0 §11): Reconciliation Engine. Para cada evento
 * recém-interpretado, busca correspondências em três "piscinas" dentro da mesma
 * household: (1) transações já confirmadas no ledger, (2) outros eventos já
 * interpretados de OUTROS documentos, (3) fatos de cabeçalho de fatura/boleto
 * (`extracted_entities` entity_type 'bill'/'boleto' — Macrofase 5/6, reaproveitando
 * os valores do enum original da Macrofase 1 sem precisar de migração nova).
 *
 * "IA não é autoridade financeira": este módulo NUNCA escreve em
 * `financial_event_relations` (relação confirmada) nem em `transactions`. Ele só
 * grava sugestões em `reconciliation_candidates`, status sempre 'pending' — a
 * fila de revisão humana (Macrofase 8) é quem decide accept/reject.
 *
 * Escopo explicitamente de fora: "importações anteriores" (`import_rows`, citado
 * no PRD 2.0 §11) não é buscado aqui. É staging de um pipeline diferente (import
 * manual de CSV/OFX/XLSX, Fase 1) — cada linha ainda não confirmada é, ela mesma,
 * uma sugestão sem autoridade, e reconciliar uma sugestão de IA contra outra
 * sugestão não confirmada não produz nenhum fato novo. Quando uma import_row é
 * confirmada ela vira uma `transactions` normal — que já é buscada na piscina
 * (1) — então nenhuma correspondência real fica de fora por essa decisão.
 */

const DATE_WINDOW_DAYS = 5;
const MIN_SCORE_TO_PERSIST = 0.4;

export type ReconciliationEventInput = {
  interpretedEventId: string;
  householdId: string;
  documentId: string;
  eventType: FinancialEventType;
  amount: number | null;
  effectiveDate: string | null;
  merchantNormalized: string | null;
  rawDescription: string | null;
  direction: "debit" | "credit" | null;
};

type CandidateKind = "transaction" | "interpreted_event" | "bill_entity" | "boleto_entity";
type CandidateType = "transaction" | "interpreted_financial_event" | "extracted_entity";

type RelationSignals = {
  candidateKind: CandidateKind;
  eventType: FinancialEventType;
  amountsMatch: boolean;
  dateDeltaDays: number | null;
  descriptionSimilarity: number;
  sameDirection: boolean | null;
};

// ── funções puras (testáveis sem Supabase) ──────────────────────────────────

/** 1 = valores praticamente iguais (até 0,1% de diferença relativa), decaindo
 * linearmente até 0 numa diferença relativa de 5%. Compara sempre por módulo —
 * a direção (débito/crédito) é um sinal separado, tratado por `sameDirection`. */
export function amountCloseness(a: number, b: number): number {
  const diff = Math.abs(Math.abs(a) - Math.abs(b));
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  const relDiff = diff / scale;
  if (relDiff <= 0.001) return 1;
  if (relDiff >= 0.05) return 0;
  return 1 - relDiff / 0.05;
}

/** Similaridade de Jaccard sobre tokens normalizados (sem acento/maiúscula,
 * tokens com mais de 2 letras) — heurística simples, sem dependência externa. */
export function descriptionSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const tokensA = new Set(normalize(a).split(/\s+/).filter((t) => t.length > 2));
  const tokensB = new Set(normalize(b).split(/\s+/).filter((t) => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Diferença absoluta em dias entre duas datas ISO (YYYY-MM-DD). `null` quando
 * uma das duas não existe — "sem data" nunca é tratado como "data igual". */
export function dateDeltaDays(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(da - db) / 86_400_000;
}

/** Score 0–1 combinando os sinais do PRD 2.0 §11 (valor, data, descrição,
 * direção). Pesos: valor é o sinal mais forte (0.45) por ser o mais confiável e
 * objetivo; data decai a 0 em 10 dias (0.25); descrição via Jaccard (0.2);
 * direção consistente soma um pouco (0.1), inconsistente tira um pouco (-0.05) —
 * nunca decide sozinha, já que em pares confirmado/comprovante a direção nem
 * sempre é comparável (ex.: fatura/boleto não têm direção própria). */
export function computeMatchScore(signals: {
  amountCloseness: number;
  dateDeltaDays: number | null;
  descriptionSimilarity: number;
  sameDirection: boolean | null;
}): number {
  let score = signals.amountCloseness * 0.45;
  if (signals.dateDeltaDays !== null) {
    score += Math.max(0, 1 - signals.dateDeltaDays / 10) * 0.25;
  }
  score += signals.descriptionSimilarity * 0.2;
  if (signals.sameDirection === true) score += 0.1;
  else if (signals.sameDirection === false) score -= 0.05;
  return Math.max(0, Math.min(1, score));
}

/**
 * PRD 2.0 §11: "Uma correspondência pode significar duplicate, settlement,
 * refund, transfer pair, installment ou apenas related." INSTALLMENT é
 * deliberadamente excluído da detecção automática aqui — já é capturado de
 * forma explícita via `installment_current`/`installment_total` na própria
 * interpretação (Macrofase 4), não depende de reconciliação pra existir.
 */
export function classifyRelationType(signals: RelationSignals): ReconciliationRelationType {
  // Fatura/boleto nunca têm evento próprio (Macrofase 5/6) — qualquer
  // correspondência com um deles só pode significar "isto quita aquilo".
  if (signals.candidateKind === "bill_entity" || signals.candidateKind === "boleto_entity") {
    return "BILL_PAYMENT";
  }
  if (signals.eventType === "refund") {
    return "REFUND";
  }
  if (
    signals.amountsMatch &&
    signals.dateDeltaDays !== null &&
    signals.dateDeltaDays <= 1 &&
    signals.descriptionSimilarity >= 0.5 &&
    signals.sameDirection !== false
  ) {
    return "DUPLICATE";
  }
  if (
    (signals.eventType === "transfer" || signals.eventType === "pix_sent" || signals.eventType === "pix_received") &&
    signals.amountsMatch &&
    signals.sameDirection === false
  ) {
    return "TRANSFER_PAIR";
  }
  if (
    (signals.eventType === "payment" || signals.eventType === "card_payment" || signals.eventType === "boleto_payment") &&
    signals.amountsMatch
  ) {
    return "SETTLEMENT";
  }
  return "RELATED";
}

function directionMatchesTransactionType(direction: "debit" | "credit" | null, type: TransactionType): boolean | null {
  if (!direction) return null;
  if (type === "expense") return direction === "debit";
  if (type === "income") return direction === "credit";
  return null; // transfer/adjustment: sinal ambíguo, não penaliza nem ajuda
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── orquestração (usa Supabase — busca as 3 piscinas + grava sugestões) ─────

type CandidateRow = {
  candidateType: CandidateType;
  candidateId: string;
  candidateKind: CandidateKind;
  candidateAmount: number;
  candidateDate: string | null;
  candidateDescription: string | null;
  sameDirection: boolean | null;
};

/** Roda a reconciliação pra um único evento recém-interpretado e persiste as
 * sugestões que baterem o score mínimo. Retorna quantas foram gravadas. Chamada
 * de forma best-effort pelo pipeline — uma falha aqui nunca deve derrubar o
 * processamento do documento em si (ver `pipeline.ts`). */
export async function runReconciliationForEvent(
  supabase: SupabaseClient,
  input: ReconciliationEventInput,
): Promise<number> {
  // Sem valor não há o que reconciliar com confiança — o sinal primário do PRD
  // 2.0 §11 ("valor e moeda") simplesmente não existe pra este evento.
  if (input.amount == null) return 0;

  const description = input.merchantNormalized ?? input.rawDescription;
  const dateFrom = input.effectiveDate ? shiftDate(input.effectiveDate, -DATE_WINDOW_DAYS) : null;
  const dateTo = input.effectiveDate ? shiftDate(input.effectiveDate, DATE_WINDOW_DAYS) : null;

  const candidates: CandidateRow[] = [];

  // Piscina 1 — transações já confirmadas no ledger.
  let txQuery = supabase
    .from("transactions")
    .select("id, description, merchant, amount, transaction_date, type")
    .eq("household_id", input.householdId)
    .is("deleted_at", null);
  if (dateFrom && dateTo) txQuery = txQuery.gte("transaction_date", dateFrom).lte("transaction_date", dateTo);
  const { data: transactions } = await txQuery;
  for (const tx of transactions ?? []) {
    candidates.push({
      candidateType: "transaction",
      candidateId: tx.id,
      candidateKind: "transaction",
      candidateAmount: tx.amount,
      candidateDate: tx.transaction_date,
      candidateDescription: tx.merchant ?? tx.description,
      sameDirection: directionMatchesTransactionType(input.direction, tx.type),
    });
  }

  // Piscina 2 — outros eventos já interpretados, de OUTROS documentos (nunca do
  // mesmo documento — dois lançamentos da mesma fatura não se reconciliam entre si).
  let evQuery = supabase
    .from("extracted_financial_events")
    .select(
      "id, document_id, raw_description, parsed_date, direction, interpreted_financial_events(id, event_type, amount, effective_date, merchant_normalized, is_current)",
    )
    .eq("household_id", input.householdId)
    .neq("document_id", input.documentId);
  if (dateFrom && dateTo) evQuery = evQuery.gte("parsed_date", dateFrom).lte("parsed_date", dateTo);
  const { data: otherEvents } = await evQuery;
  for (const row of otherEvents ?? []) {
    const current = (row.interpreted_financial_events ?? []).find((ife) => ife.is_current);
    if (!current || current.amount == null) continue;
    candidates.push({
      candidateType: "interpreted_financial_event",
      candidateId: current.id,
      candidateKind: "interpreted_event",
      candidateAmount: current.amount,
      candidateDate: current.effective_date ?? row.parsed_date,
      candidateDescription: current.merchant_normalized ?? row.raw_description,
      sameDirection: input.direction && row.direction ? input.direction === row.direction : null,
    });
  }

  // Piscina 3 — fatos de cabeçalho de fatura/boleto (Macrofase 5/6): a única
  // fonte de "obrigação em aberto" que ainda não virou evento nenhum.
  const { data: entities } = await supabase
    .from("extracted_entities")
    .select(
      "id, entity_type, raw_value, normalized_value, metadata, document_id, financial_documents!inner(household_id)",
    )
    .in("entity_type", ["bill", "boleto"])
    .eq("financial_documents.household_id", input.householdId)
    .neq("document_id", input.documentId);
  for (const entity of entities ?? []) {
    const metadata = entity.metadata as {
      totalAmount?: number | null;
      amount?: number | null;
      dueDate?: string | null;
    } | null;
    const candidateAmount = entity.entity_type === "bill" ? metadata?.totalAmount : metadata?.amount;
    if (candidateAmount == null) continue;
    candidates.push({
      candidateType: "extracted_entity",
      candidateId: entity.id,
      candidateKind: entity.entity_type === "bill" ? "bill_entity" : "boleto_entity",
      candidateAmount,
      candidateDate: metadata?.dueDate ?? null,
      candidateDescription: entity.normalized_value ?? entity.raw_value,
      sameDirection: null,
    });
  }

  let persisted = 0;
  for (const candidate of candidates) {
    const closeness = amountCloseness(input.amount, candidate.candidateAmount);
    if (closeness === 0) continue; // nenhuma proximidade de valor — nem entra na conta

    const delta = dateDeltaDays(input.effectiveDate, candidate.candidateDate);
    const descSim = descriptionSimilarity(description, candidate.candidateDescription);
    const score = computeMatchScore({
      amountCloseness: closeness,
      dateDeltaDays: delta,
      descriptionSimilarity: descSim,
      sameDirection: candidate.sameDirection,
    });
    if (score < MIN_SCORE_TO_PERSIST) continue;

    const relationType = classifyRelationType({
      candidateKind: candidate.candidateKind,
      eventType: input.eventType,
      amountsMatch: closeness >= 0.999,
      dateDeltaDays: delta,
      descriptionSimilarity: descSim,
      sameDirection: candidate.sameDirection,
    });

    const evidence: Json = {
      eventAmount: input.amount,
      candidateAmount: candidate.candidateAmount,
      amountCloseness: closeness,
      eventDate: input.effectiveDate,
      candidateDate: candidate.candidateDate,
      dateDeltaDays: delta,
      descriptionSimilarity: descSim,
      candidateDescription: candidate.candidateDescription,
      sameDirection: candidate.sameDirection,
    };

    const { error } = await supabase.from("reconciliation_candidates").insert({
      id: randomUUID(),
      household_id: input.householdId,
      interpreted_event_id: input.interpretedEventId,
      candidate_type: candidate.candidateType,
      candidate_id: candidate.candidateId,
      relation_type_suggested: relationType,
      score,
      score_version: 1,
      evidence,
      status: "pending",
    });
    if (!error) persisted++;
  }

  return persisted;
}
