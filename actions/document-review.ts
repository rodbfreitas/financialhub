"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { getReviewQueueForDocument } from "@/lib/documents/review/queue";
import { runReconciliationForEvent } from "@/lib/documents/reconciliation/engine";
import { materializeAcceptedEvent } from "@/lib/documents/materialization/import-materializer";
import type { Database } from "@/types/database";

type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];

/**
 * Fase 2 — Macrofase 8 (UX/UI 2.0 DOC-05/06/09, PRD 2.0 §12 "Fila de revisão"):
 * transforma eventos interpretados (Macrofase 3-4) e sugestões de reconciliação
 * (Macrofase 7) em decisões humanas de verdade. "IA não é autoridade financeira"
 * continua valendo — nada aqui escreve em `transactions`; aceitar um evento só
 * marca a interpretação como confirmada pela revisão, a materialização em
 * transação real é a Macrofase 9-10.
 */

export type DocumentReviewActionState = { error?: string } | null;

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Documento sai de "Para revisar" pra "Concluído" só quando não sobra nada pra
 * decidir: nem evento pendente, nem candidato de reconciliação pendente (mesmo
 * um candidato "órfão" de um evento já aceito antes dele). */
async function maybeMarkDocumentReviewed(supabase: Awaited<ReturnType<typeof createClient>>, documentId: string) {
  const remainingEvents = await getReviewQueueForDocument(supabase, documentId);
  if (remainingEvents.length > 0) return;

  const { data: eventRows } = await supabase
    .from("extracted_financial_events")
    .select("interpreted_financial_events(id)")
    .eq("document_id", documentId);
  const allEventIds = (eventRows ?? []).flatMap((r) => (r.interpreted_financial_events ?? []).map((i) => i.id));

  let pendingCandidates = 0;
  if (allEventIds.length > 0) {
    const { count } = await supabase
      .from("reconciliation_candidates")
      .select("id", { count: "exact", head: true })
      .in("interpreted_event_id", allEventIds)
      .eq("status", "pending");
    pendingCandidates = count ?? 0;
  }

  if (pendingCandidates === 0) {
    await supabase.from("financial_documents").update({ status: "reviewed" }).eq("id", documentId);
  }
}

function revalidateReview(documentId: string) {
  revalidatePath(`/documentos/${documentId}`);
  revalidatePath(`/documentos/${documentId}/revisao`);
  revalidatePath("/documentos");
}

/**
 * Fase 2 — Macrofase 9 (ERD 2.0 §18/§20): aceitar um evento materializa ele como
 * `import_rows`, reaproveitando o pipeline de confirmação da Etapa 9 — MAS só quando
 * o evento é, de fato, um lançamento novo. Se uma correspondência já foi aceita
 * (Macrofase 8) marcando este evento como DUPLICATE/SETTLEMENT/BILL_PAYMENT contra
 * uma transação já existente, criar um import_row aqui duplicaria a transação —
 * o evento já virou evidência dela via `transaction_evidence_links`, então "aceitar"
 * só confirma a leitura, sem gerar staging novo.
 */
export async function acceptEvent(documentId: string, interpretedEventId: string): Promise<DocumentReviewActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };
  const userId = await currentUserId(supabase);

  const { data: alreadySettled } = await supabase
    .from("reconciliation_candidates")
    .select("id")
    .eq("interpreted_event_id", interpretedEventId)
    .eq("status", "accepted")
    .eq("candidate_type", "transaction")
    .in("relation_type_suggested", ["DUPLICATE", "SETTLEMENT", "BILL_PAYMENT"])
    .limit(1)
    .maybeSingle();

  if (!alreadySettled) {
    const { data: event } = await supabase
      .from("interpreted_financial_events")
      .select("event_type, amount, effective_date, merchant_normalized, extracted_financial_events(raw_description, direction)")
      .eq("id", interpretedEventId)
      .maybeSingle();

    if (!event || event.amount === null || event.effective_date === null) {
      return { error: "Este lançamento não tem valor ou data suficientes para ser confirmado." };
    }

    const result = await materializeAcceptedEvent(supabase, {
      householdId,
      documentId,
      interpretedEventId,
      eventType: event.event_type,
      amount: event.amount,
      effectiveDate: event.effective_date,
      merchantNormalized: event.merchant_normalized,
      rawDescription: event.extracted_financial_events?.raw_description ?? null,
      direction: (event.extracted_financial_events?.direction as "debit" | "credit" | null) ?? null,
      decidedBy: userId,
    });

    if (result.status === "error") return { error: result.message };
  }

  const { error } = await supabase.from("document_review_decisions").insert({
    id: randomUUID(),
    household_id: householdId,
    document_id: documentId,
    interpreted_event_id: interpretedEventId,
    decided_by: userId,
    decision_action: "event_accepted",
  });
  if (error) return { error: "Não foi possível salvar a decisão." };

  await maybeMarkDocumentReviewed(supabase, documentId);
  revalidateReview(documentId);
  return null;
}

export async function rejectEvent(
  documentId: string,
  interpretedEventId: string,
  notes?: string,
): Promise<DocumentReviewActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };
  const userId = await currentUserId(supabase);

  await supabase.from("interpreted_financial_events").update({ is_current: false }).eq("id", interpretedEventId);
  // Correspondências sugeridas pra uma interpretação que acabou de ser rejeitada
  // não fazem mais sentido — expira em vez de deixar "pending" pra sempre.
  await supabase
    .from("reconciliation_candidates")
    .update({ status: "expired" })
    .eq("interpreted_event_id", interpretedEventId)
    .eq("status", "pending");

  const { error } = await supabase.from("document_review_decisions").insert({
    id: randomUUID(),
    household_id: householdId,
    document_id: documentId,
    interpreted_event_id: interpretedEventId,
    decided_by: userId,
    decision_action: "event_rejected",
    notes: notes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a decisão." };

  await maybeMarkDocumentReviewed(supabase, documentId);
  revalidateReview(documentId);
  return null;
}

export type EditEventInput = {
  documentId: string;
  interpretedEventId: string;
  eventType: FinancialEventType;
  amount: number;
  effectiveDate: string;
  merchantNormalized: string | null;
};

/** "Consegue corrigir interpretação sem alterar o original" (UX 2.0 §objetivos):
 * nunca sobrescreve a versão anterior — cria uma nova `interpretation_version`,
 * marca a antiga como não-atual. O evento bruto (`extracted_financial_events`,
 * camada "Original") nunca é tocado. */
export async function editEvent(input: EditEventInput): Promise<DocumentReviewActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };
  const userId = await currentUserId(supabase);

  const { data: oldEvent } = await supabase
    .from("interpreted_financial_events")
    .select("extracted_event_id, interpretation_version, installment_current, installment_total")
    .eq("id", input.interpretedEventId)
    .maybeSingle();
  if (!oldEvent) return { error: "Lançamento não encontrado." };

  const { data: extractedEvent } = await supabase
    .from("extracted_financial_events")
    .select("document_id, household_id, direction, raw_description")
    .eq("id", oldEvent.extracted_event_id)
    .maybeSingle();
  if (!extractedEvent) return { error: "Evento original não encontrado." };

  await supabase.from("interpreted_financial_events").update({ is_current: false }).eq("id", input.interpretedEventId);
  await supabase
    .from("reconciliation_candidates")
    .update({ status: "expired" })
    .eq("interpreted_event_id", input.interpretedEventId)
    .eq("status", "pending");

  const newEventId = randomUUID();
  const { error: insertError } = await supabase.from("interpreted_financial_events").insert({
    id: newEventId,
    extracted_event_id: oldEvent.extracted_event_id,
    interpretation_version: oldEvent.interpretation_version + 1,
    event_type: input.eventType,
    amount: input.amount,
    effective_date: input.effectiveDate,
    merchant_normalized: input.merchantNormalized,
    installment_current: oldEvent.installment_current,
    installment_total: oldEvent.installment_total,
    interpretation_confidence: 1,
    is_current: true,
    reason_codes: ["human_edit"],
  });
  if (insertError) return { error: "Não foi possível salvar a correção." };

  await supabase.from("document_event_evidence").insert({
    id: randomUUID(),
    interpreted_event_id: newEventId,
    document_id: extractedEvent.document_id,
    role: "primary",
  });

  // A correção pode mudar o que ela bate — roda a reconciliação de novo pra essa
  // nova versão. Best-effort, igual ao pipeline original (Macrofase 7).
  try {
    await runReconciliationForEvent(supabase, {
      interpretedEventId: newEventId,
      householdId: extractedEvent.household_id,
      documentId: extractedEvent.document_id,
      eventType: input.eventType,
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      merchantNormalized: input.merchantNormalized,
      rawDescription: extractedEvent.raw_description,
      direction: extractedEvent.direction as "debit" | "credit" | null,
    });
  } catch (reconciliationError) {
    console.error(`[document-review] reconciliação falhou p/ evento editado ${newEventId}:`, reconciliationError);
  }

  // Editar já implica confirmar o valor corrigido (Macrofase 9) — uma versão recém
  // criada nunca pode ter um candidato já aceito contra ela, então materializa direto.
  const materializeResult = await materializeAcceptedEvent(supabase, {
    householdId: extractedEvent.household_id,
    documentId: extractedEvent.document_id,
    interpretedEventId: newEventId,
    eventType: input.eventType,
    amount: input.amount,
    effectiveDate: input.effectiveDate,
    merchantNormalized: input.merchantNormalized,
    rawDescription: extractedEvent.raw_description,
    direction: extractedEvent.direction as "debit" | "credit" | null,
    decidedBy: userId,
  });
  if (materializeResult.status === "error") return { error: materializeResult.message };

  const { error: decisionError } = await supabase.from("document_review_decisions").insert({
    id: randomUUID(),
    household_id: householdId,
    document_id: input.documentId,
    interpreted_event_id: newEventId,
    decided_by: userId,
    decision_action: "event_edited",
  });
  if (decisionError) return { error: "Correção salva, mas não foi possível registrar a decisão." };

  await maybeMarkDocumentReviewed(supabase, input.documentId);
  revalidateReview(input.documentId);
  return null;
}

export async function acceptCandidate(documentId: string, candidateId: string): Promise<DocumentReviewActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };
  const userId = await currentUserId(supabase);

  const { data: candidate } = await supabase
    .from("reconciliation_candidates")
    .select("id, interpreted_event_id, candidate_type, candidate_id, relation_type_suggested, score, evidence, household_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return { error: "Correspondência não encontrada." };

  const { error: updateError } = await supabase
    .from("reconciliation_candidates")
    .update({ status: "accepted", decided_by: userId, decided_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (updateError) return { error: "Não foi possível salvar a decisão." };

  await supabase.from("financial_event_relations").insert({
    id: randomUUID(),
    household_id: candidate.household_id,
    relation_type: candidate.relation_type_suggested,
    source_entity_type: "interpreted_financial_event",
    source_entity_id: candidate.interpreted_event_id,
    target_entity_type: candidate.candidate_type,
    target_entity_id: candidate.candidate_id,
    confirmed_by: userId,
    confirmed_at: new Date().toISOString(),
    metadata: { score: candidate.score, evidence: candidate.evidence },
  });

  // Evidência documental (ERD 2.0 §12): "Boleto + comprovante + linha de extrato
  // → uma despesa confirmada, três evidências." Transação já confirmada usa
  // `transaction_evidence_links` (é literalmente pra isso que ela existe); outro
  // evento/entidade de outro documento vira uma evidência `supporting` a mais.
  if (candidate.candidate_type === "transaction") {
    await supabase.from("transaction_evidence_links").insert({
      id: randomUUID(),
      transaction_id: candidate.candidate_id,
      document_id: documentId,
      interpreted_event_id: candidate.interpreted_event_id,
    });
  } else if (candidate.candidate_type === "interpreted_financial_event") {
    const { data: otherEvent } = await supabase
      .from("interpreted_financial_events")
      .select("extracted_financial_events(document_id)")
      .eq("id", candidate.candidate_id)
      .maybeSingle();
    const otherDocId = otherEvent?.extracted_financial_events?.document_id;
    if (otherDocId) {
      await supabase.from("document_event_evidence").insert({
        id: randomUUID(),
        interpreted_event_id: candidate.interpreted_event_id,
        document_id: otherDocId,
        role: "supporting",
      });
    }
  } else if (candidate.candidate_type === "extracted_entity") {
    const { data: entity } = await supabase
      .from("extracted_entities")
      .select("document_id")
      .eq("id", candidate.candidate_id)
      .maybeSingle();
    if (entity) {
      await supabase.from("document_event_evidence").insert({
        id: randomUUID(),
        interpreted_event_id: candidate.interpreted_event_id,
        document_id: entity.document_id,
        role: "supporting",
      });
    }
  }

  await supabase.from("document_review_decisions").insert({
    id: randomUUID(),
    household_id: householdId,
    document_id: documentId,
    interpreted_event_id: candidate.interpreted_event_id,
    reconciliation_candidate_id: candidateId,
    decided_by: userId,
    decision_action: "candidate_accepted",
  });

  await maybeMarkDocumentReviewed(supabase, documentId);
  revalidateReview(documentId);
  return null;
}

export async function rejectCandidate(documentId: string, candidateId: string): Promise<DocumentReviewActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };
  const userId = await currentUserId(supabase);

  const { data: candidate } = await supabase
    .from("reconciliation_candidates")
    .select("interpreted_event_id")
    .eq("id", candidateId)
    .maybeSingle();

  const { error } = await supabase
    .from("reconciliation_candidates")
    .update({ status: "rejected", decided_by: userId, decided_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) return { error: "Não foi possível salvar a decisão." };

  await supabase.from("document_review_decisions").insert({
    id: randomUUID(),
    household_id: householdId,
    document_id: documentId,
    interpreted_event_id: candidate?.interpreted_event_id ?? null,
    reconciliation_candidate_id: candidateId,
    decided_by: userId,
    decision_action: "candidate_rejected",
  });

  await maybeMarkDocumentReviewed(supabase, documentId);
  revalidateReview(documentId);
  return null;
}
