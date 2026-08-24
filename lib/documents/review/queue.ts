import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Tipado via `@supabase/supabase-js` (não `lib/supabase/server.ts`) de propósito —
// ver o mesmo comentário em `lib/documents/reconciliation/engine.ts`: evita puxar
// `next/headers` só pra tipagem, o que quebraria os testes das funções puras.
type SupabaseClient = SupabaseJsClient<Database>;
type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];
type ReconciliationRelationType = Database["public"]["Enums"]["reconciliation_relation_type"];

/**
 * Fase 2 — Macrofase 8 (UX/UI 2.0 DOC-05/DOC-06, PRD 2.0 §12): monta a fila de
 * revisão de UM documento — "uma fila de decisões, não uma tabela infinita".
 * Escopo desta primeira versão, decisão documentada: a fila é por documento
 * (entrada natural pelo botão "Abrir revisão" no card do Inbox), não uma fila
 * global cross-documento — o schema não impede evoluir pra isso depois (tudo já
 * é filtrável por household), mas o P0 aqui é revisar o que UM documento trouxe.
 */

export type ReviewCandidateSummary = {
  candidateId: string;
  candidateType: string;
  relationTypeSuggested: ReconciliationRelationType;
  score: number;
  label: string;
  amount: number | null;
  date: string | null;
  sourceDocumentName: string | null;
};

export type ReviewQueueItem = {
  interpretedEventId: string;
  extractedEventId: string;
  eventType: FinancialEventType;
  amount: number | null;
  effectiveDate: string | null;
  merchantNormalized: string | null;
  rawDescription: string | null;
  interpretationConfidence: number | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  candidates: ReviewCandidateSummary[];
};

/**
 * Prioridade simplificada da UX 2.0 §8 ("erros → baixa confiança → duplicidade →
 * relações incertas → perfil/categoria → novos"): decisão de escopo documentada
 * — implementamos os três primeiros níveis (duplicidade suspeita primeiro, depois
 * baixa confiança, depois qualquer correspondência pendente), já que perfil/
 * categoria ainda não têm UI de sugestão própria nesta fase. O resto cai no nível
 * "novo", na ordem em que os eventos foram extraídos do documento — nunca
 * reordenado silenciosamente além disso.
 */
export function priorityOf(item: Pick<ReviewQueueItem, "interpretationConfidence" | "candidates">): number {
  if (item.candidates.some((c) => c.relationTypeSuggested === "DUPLICATE")) return 0;
  if ((item.interpretationConfidence ?? 1) < 0.5) return 1;
  if (item.candidates.length > 0) return 2;
  return 3;
}

/** Sort estável (spec ES2019+) — dentro da mesma prioridade, mantém a ordem
 * original (que já é a ordem de leitura do documento, `source_event_index`). */
export function sortQueueItems(items: ReviewQueueItem[]): ReviewQueueItem[] {
  return [...items].sort((a, b) => priorityOf(a) - priorityOf(b));
}

export async function getReviewQueueForDocument(
  supabase: SupabaseClient,
  documentId: string,
): Promise<ReviewQueueItem[]> {
  const { data: rows } = await supabase
    .from("extracted_financial_events")
    .select(
      "id, raw_description, interpreted_financial_events(id, event_type, amount, effective_date, merchant_normalized, interpretation_confidence, installment_current, installment_total, is_current)",
    )
    .eq("document_id", documentId)
    .order("source_event_index", { ascending: true });

  const currentEvents = (rows ?? [])
    .map((row) => {
      const current = (row.interpreted_financial_events ?? []).find((ife) => ife.is_current);
      if (!current) return null;
      return { extractedEventId: row.id, rawDescription: row.raw_description, interpreted: current };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (currentEvents.length === 0) return [];

  // Eventos já decididos (aceitos) saem da fila — editados/rejeitados já saíram
  // sozinhos por não serem mais `is_current` (ver `actions/document-review.ts`).
  const { data: acceptedDecisions } = await supabase
    .from("document_review_decisions")
    .select("interpreted_event_id")
    .eq("document_id", documentId)
    .eq("decision_action", "event_accepted");
  const acceptedIds = new Set((acceptedDecisions ?? []).map((d) => d.interpreted_event_id));

  const pendingEvents = currentEvents.filter((e) => !acceptedIds.has(e.interpreted.id));
  if (pendingEvents.length === 0) return [];

  const interpretedEventIds = pendingEvents.map((e) => e.interpreted.id);
  const { data: candidateRows } = await supabase
    .from("reconciliation_candidates")
    .select("id, interpreted_event_id, candidate_type, candidate_id, relation_type_suggested, score")
    .in("interpreted_event_id", interpretedEventIds)
    .eq("status", "pending");

  const candidatesByEvent = new Map<string, NonNullable<typeof candidateRows>>();
  for (const c of candidateRows ?? []) {
    const list = candidatesByEvent.get(c.interpreted_event_id) ?? [];
    list.push(c);
    candidatesByEvent.set(c.interpreted_event_id, list);
  }

  const resolvedCandidates = await resolveCandidateSummaries(supabase, candidateRows ?? []);

  return pendingEvents.map((e) => ({
    interpretedEventId: e.interpreted.id,
    extractedEventId: e.extractedEventId,
    eventType: e.interpreted.event_type,
    amount: e.interpreted.amount,
    effectiveDate: e.interpreted.effective_date,
    merchantNormalized: e.interpreted.merchant_normalized,
    rawDescription: e.rawDescription,
    interpretationConfidence: e.interpreted.interpretation_confidence,
    installmentCurrent: e.interpreted.installment_current,
    installmentTotal: e.interpreted.installment_total,
    candidates: (candidatesByEvent.get(e.interpreted.id) ?? []).map(
      (c) => resolvedCandidates.get(c.id) ?? fallbackCandidateSummary(c),
    ),
  }));
}

type CandidateRow = {
  id: string;
  interpreted_event_id: string;
  candidate_type: string;
  candidate_id: string;
  relation_type_suggested: ReconciliationRelationType;
  score: number;
};

function fallbackCandidateSummary(c: CandidateRow): ReviewCandidateSummary {
  return {
    candidateId: c.id,
    candidateType: c.candidate_type,
    relationTypeSuggested: c.relation_type_suggested,
    score: c.score,
    label: "Correspondência",
    amount: null,
    date: null,
    sourceDocumentName: null,
  };
}

/** Resolve cada candidato num resumo legível — busca em lote por tipo (nunca
 * N+1) já que uma fila de documento costuma ter poucas dezenas de candidatos. */
async function resolveCandidateSummaries(
  supabase: SupabaseClient,
  candidates: CandidateRow[],
): Promise<Map<string, ReviewCandidateSummary>> {
  const result = new Map<string, ReviewCandidateSummary>();
  if (candidates.length === 0) return result;

  const byType = {
    transaction: candidates.filter((c) => c.candidate_type === "transaction"),
    interpreted_financial_event: candidates.filter((c) => c.candidate_type === "interpreted_financial_event"),
    extracted_entity: candidates.filter((c) => c.candidate_type === "extracted_entity"),
  };

  if (byType.transaction.length > 0) {
    const ids = byType.transaction.map((c) => c.candidate_id);
    const { data: txs } = await supabase.from("transactions").select("id, description, merchant, amount, transaction_date").in("id", ids);
    const byId = new Map((txs ?? []).map((t) => [t.id, t]));
    for (const c of byType.transaction) {
      const tx = byId.get(c.candidate_id);
      result.set(c.id, {
        candidateId: c.id,
        candidateType: c.candidate_type,
        relationTypeSuggested: c.relation_type_suggested,
        score: c.score,
        label: tx ? (tx.merchant ?? tx.description) : "Transação",
        amount: tx?.amount ?? null,
        date: tx?.transaction_date ?? null,
        sourceDocumentName: null,
      });
    }
  }

  if (byType.interpreted_financial_event.length > 0) {
    const ids = byType.interpreted_financial_event.map((c) => c.candidate_id);
    const { data: ifes } = await supabase
      .from("interpreted_financial_events")
      .select("id, amount, effective_date, merchant_normalized, extracted_event_id, extracted_financial_events(document_id, raw_description)")
      .in("id", ids);
    const docIds = [
      ...new Set((ifes ?? []).map((i) => i.extracted_financial_events?.document_id).filter((x): x is string => !!x)),
    ];
    const docNames = await fetchDocumentNames(supabase, docIds);
    const byId = new Map((ifes ?? []).map((i) => [i.id, i]));
    for (const c of byType.interpreted_financial_event) {
      const ife = byId.get(c.candidate_id);
      const docId = ife?.extracted_financial_events?.document_id ?? null;
      result.set(c.id, {
        candidateId: c.id,
        candidateType: c.candidate_type,
        relationTypeSuggested: c.relation_type_suggested,
        score: c.score,
        label: ife?.merchant_normalized ?? ife?.extracted_financial_events?.raw_description ?? "Outro lançamento",
        amount: ife?.amount ?? null,
        date: ife?.effective_date ?? null,
        sourceDocumentName: docId ? (docNames.get(docId) ?? null) : null,
      });
    }
  }

  if (byType.extracted_entity.length > 0) {
    const ids = byType.extracted_entity.map((c) => c.candidate_id);
    const { data: entities } = await supabase
      .from("extracted_entities")
      .select("id, entity_type, raw_value, normalized_value, metadata, document_id")
      .in("id", ids);
    const docIds = [...new Set((entities ?? []).map((e) => e.document_id))];
    const docNames = await fetchDocumentNames(supabase, docIds);
    const byId = new Map((entities ?? []).map((e) => [e.id, e]));
    for (const c of byType.extracted_entity) {
      const entity = byId.get(c.candidate_id);
      const metadata = entity?.metadata as { totalAmount?: number | null; amount?: number | null; dueDate?: string | null } | null;
      const fallbackLabel = entity?.entity_type === "bill" ? "Fatura" : "Boleto";
      result.set(c.id, {
        candidateId: c.id,
        candidateType: c.candidate_type,
        relationTypeSuggested: c.relation_type_suggested,
        score: c.score,
        label: entity ? (entity.normalized_value ?? entity.raw_value) : fallbackLabel,
        amount: (metadata?.totalAmount ?? metadata?.amount) ?? null,
        date: metadata?.dueDate ?? null,
        sourceDocumentName: entity ? (docNames.get(entity.document_id) ?? null) : null,
      });
    }
  }

  return result;
}

async function fetchDocumentNames(supabase: SupabaseClient, documentIds: string[]): Promise<Map<string, string>> {
  if (documentIds.length === 0) return new Map();
  const { data } = await supabase.from("financial_documents").select("id, original_filename").in("id", documentIds);
  return new Map((data ?? []).map((d) => [d.id, d.original_filename]));
}
