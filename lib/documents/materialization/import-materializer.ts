import { randomUUID } from "node:crypto";
import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";
import { computeDedupHash, findDuplicateTransaction } from "@/lib/imports/dedup";
import { matchCategory } from "@/lib/imports/categorize";
import type { Database, Json } from "@/types/database";

// Tipado via `@supabase/supabase-js` (não `lib/supabase/server.ts`) — mesmo motivo
// documentado em `lib/documents/reconciliation/engine.ts`: evita puxar `next/headers`
// só pra tipagem, o que quebraria os testes das funções puras abaixo.
type SupabaseClient = SupabaseJsClient<Database>;
type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];
type ImportRowStatus = Database["public"]["Enums"]["import_row_status"];

/**
 * Fase 2 — Macrofase 9 (ERD 2.0 §18/§20 "ImportMaterializer"): converte um evento
 * interpretado ACEITO na fila de revisão (Macrofase 8) num `import_rows`, dentro de
 * um `imports` (source_type `'ai'`, valor já previsto no enum desde a Fase 1 e nunca
 * usado até agora) — reaproveitando literalmente o mesmo pipeline de staging →
 * revisão → confirmação da Etapa 9 (Fase 1, `actions/imports.ts` `confirmImport`),
 * em vez de criar um caminho novo pra `transactions`. "Documento ≠ transação"
 * continua valendo até aqui: isto só cria a LINHA DE STAGING, nunca escreve em
 * `transactions` diretamente — só `confirmImport` (decisão humana explícita, já
 * existente) faz isso.
 */

const EXPENSE_EVENT_TYPES = new Set<FinancialEventType>([
  "purchase",
  "boleto_payment",
  "card_payment",
  "fee",
  "interest",
  "penalty",
  "installment",
  "direct_debit",
  "pix_sent",
  "withdrawal",
  "payment",
]);

const INCOME_EVENT_TYPES = new Set<FinancialEventType>(["income", "refund", "yield", "deposit", "pix_received"]);

/**
 * `interpreted_financial_events.amount` só vem com sinal confiável quando a extração
 * original já tinha um sinal explícito no texto (extrato com "-1.250,00" ou sufixo
 * D/C) — comprovantes em formato de formulário (Macrofase 6) sempre extraem um valor
 * positivo, com a direção vindo de um sinal separado (rótulo de pagador/beneficiário).
 * Por isso o sinal final pra materialização usa `direction` (quando existe) e só cai
 * pro tipo de evento como *default* — nunca inventa uma direção que a extração não
 * tinha: nesse caso último caso (sem direção nem tipo reconhecido) mantém o sinal já
 * presente no valor interpretado, o que for.
 */
export function signedAmountForMaterialization(
  eventType: FinancialEventType,
  direction: "debit" | "credit" | null,
  amount: number,
): number {
  const abs = Math.abs(amount);
  if (direction === "credit") return abs;
  if (direction === "debit") return -abs;
  if (INCOME_EVENT_TYPES.has(eventType)) return abs;
  if (EXPENSE_EVENT_TYPES.has(eventType)) return -abs;
  return amount;
}

export type MaterializeInput = {
  householdId: string;
  documentId: string;
  interpretedEventId: string;
  eventType: FinancialEventType;
  amount: number;
  effectiveDate: string;
  merchantNormalized: string | null;
  rawDescription: string | null;
  direction: "debit" | "credit" | null;
  decidedBy: string | null;
};

export type MaterializeResult =
  | { status: "created"; importRowId: string; importId: string }
  | { status: "already_materialized"; importRowId: string }
  | { status: "error"; message: string };

/** Acha (ou cria) o `imports` de um documento — todos os eventos aceitos do MESMO
 * documento caem no mesmo lote, pra "confirmação em lote" (Macrofase 10) revisar o
 * documento inteiro de uma vez, igual à UX de um import de CSV/OFX comum. */
async function getOrCreateImportForDocument(
  supabase: SupabaseClient,
  input: { householdId: string; documentId: string; decidedBy: string | null },
): Promise<{ importId: string; accountId: string | null; creditCardId: string | null } | null> {
  const { data: doc } = await supabase
    .from("financial_documents")
    .select("id, import_id, original_filename, document_type, institution_name, profile_id")
    .eq("id", input.documentId)
    .maybeSingle();
  if (!doc) return null;

  if (doc.import_id) {
    const { data: existingImport } = await supabase
      .from("imports")
      .select("id, account_id, credit_card_id")
      .eq("id", doc.import_id)
      .maybeSingle();
    if (existingImport) {
      return { importId: existingImport.id, accountId: existingImport.account_id, creditCardId: existingImport.credit_card_id };
    }
  }

  const destination = await resolveDestination(supabase, input.householdId, doc);

  const importId = randomUUID();
  const { error } = await supabase.from("imports").insert({
    id: importId,
    household_id: input.householdId,
    created_by: input.decidedBy,
    source_type: "ai",
    status: "review",
    filename: doc.original_filename,
    account_id: destination.accountId,
    credit_card_id: destination.creditCardId,
  });
  if (error) return null;

  await supabase.from("financial_documents").update({ import_id: importId }).eq("id", doc.id);

  return { importId, accountId: destination.accountId, creditCardId: destination.creditCardId };
}

/** Resolução de destino (conta/cartão) é best-effort e nunca força um palpite errado:
 * fatura → cruza os 4 últimos dígitos do resumo de cabeçalho (Macrofase 5) contra
 * `credit_cards.last_four_digits`; extrato → cruza a instituição detectada
 * (Macrofase 3-4) contra `accounts.institution_name`. Sem batida clara, fica null —
 * a linha de staging ainda é criada, só sem conta/cartão pré-preenchido (o usuário
 * escolhe na tela de confirmação, igual a um import manual sem esse dado). */
async function resolveDestination(
  supabase: SupabaseClient,
  householdId: string,
  doc: { id: string; document_type: Database["public"]["Enums"]["document_type"]; institution_name: string | null },
): Promise<{ accountId: string | null; creditCardId: string | null }> {
  if (doc.document_type === "fatura_cartao") {
    const { data: billEntity } = await supabase
      .from("extracted_entities")
      .select("metadata")
      .eq("document_id", doc.id)
      .eq("entity_type", "bill")
      .maybeSingle();
    const cardLast4 = (billEntity?.metadata as { cardLast4?: string | null } | null)?.cardLast4;
    if (cardLast4) {
      const { data: card } = await supabase
        .from("credit_cards")
        .select("id")
        .eq("household_id", householdId)
        .eq("last_four_digits", cardLast4)
        .eq("active", true)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (card) return { accountId: null, creditCardId: card.id };
    }
  }

  if (doc.document_type === "extrato_bancario" && doc.institution_name) {
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .ilike("institution_name", doc.institution_name)
      .limit(1)
      .maybeSingle();
    if (account) return { accountId: account.id, creditCardId: null };
  }

  return { accountId: null, creditCardId: null };
}

async function resolveFallbackProfileId(
  supabase: SupabaseClient,
  householdId: string,
  documentProfileId: string | null,
): Promise<string | null> {
  if (documentProfileId) return documentProfileId;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("household_id", householdId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function materializeAcceptedEvent(
  supabase: SupabaseClient,
  input: MaterializeInput,
): Promise<MaterializeResult> {
  // Idempotência (migration 023, unique constraint): nunca confia só no constraint —
  // sempre confere antes, pra não depender de tratar erro de violação de unicidade.
  const { data: existing } = await supabase
    .from("import_rows")
    .select("id")
    .eq("interpreted_event_id", input.interpretedEventId)
    .maybeSingle();
  if (existing) return { status: "already_materialized", importRowId: existing.id };

  const importInfo = await getOrCreateImportForDocument(supabase, {
    householdId: input.householdId,
    documentId: input.documentId,
    decidedBy: input.decidedBy,
  });
  if (!importInfo) return { status: "error", message: "Não foi possível preparar a importação deste documento." };

  const { data: doc } = await supabase
    .from("financial_documents")
    .select("profile_id")
    .eq("id", input.documentId)
    .maybeSingle();

  const profileId = await resolveFallbackProfileId(supabase, input.householdId, doc?.profile_id ?? null);
  if (!profileId) return { status: "error", message: "Nenhum perfil disponível neste household." };

  const description = input.merchantNormalized ?? input.rawDescription ?? "Lançamento sem descrição";
  const signedAmount = signedAmountForMaterialization(input.eventType, input.direction, input.amount);

  const dedupHash = computeDedupHash({
    accountId: importInfo.accountId,
    creditCardId: importInfo.creditCardId,
    date: input.effectiveDate,
    amount: signedAmount,
    description,
  });
  const duplicateId = await findDuplicateTransaction(supabase, input.householdId, { dedupHash });

  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("match_type, match_value, category_id, subcategory_id, priority")
    .eq("household_id", input.householdId)
    .eq("active", true);
  const suggestion = matchCategory(rules ?? [], description);

  let status: ImportRowStatus = "pending";
  if (duplicateId) status = "duplicate";
  else if (suggestion) status = "suggested";

  const importRowId = randomUUID();
  const rawData: Json = {
    __source: "document_intelligence",
    interpretedEventId: input.interpretedEventId,
    documentId: input.documentId,
    eventType: input.eventType,
    __dedupHash: dedupHash,
    __suggestedSubcategoryId: suggestion?.subcategoryId ?? null,
  };

  const { error } = await supabase.from("import_rows").insert({
    id: importRowId,
    import_id: importInfo.importId,
    interpreted_event_id: input.interpretedEventId,
    raw_data: rawData,
    parsed_date: input.effectiveDate,
    parsed_description: description,
    parsed_amount: signedAmount,
    suggested_category_id: suggestion?.categoryId ?? null,
    suggested_profile_id: profileId,
    duplicate_candidate_id: duplicateId,
    status,
  });

  if (error) return { status: "error", message: "Não foi possível preparar este lançamento para confirmação." };

  // Contadores só informativos (mostrados na lista de imports) — as linhas chegam uma
  // a uma, aceite por aceite, em vez de tudo de uma vez como num CSV, então soma em
  // cima do valor atual em vez de recalcular do zero a cada chamada.
  const { data: counters } = await supabase.from("imports").select("total_rows, valid_rows, duplicate_rows").eq("id", importInfo.importId).maybeSingle();
  await supabase
    .from("imports")
    .update({
      total_rows: (counters?.total_rows ?? 0) + 1,
      valid_rows: (counters?.valid_rows ?? 0) + (status === "duplicate" ? 0 : 1),
      duplicate_rows: (counters?.duplicate_rows ?? 0) + (status === "duplicate" ? 1 : 0),
    })
    .eq("id", importInfo.importId);

  return { status: "created", importRowId, importId: importInfo.importId };
}
