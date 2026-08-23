import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { detectInstitution } from "@/lib/documents/institution-detection";
import { pickExtractionProvider, getInterpretationProvider } from "@/lib/documents/providers/registry";
import type { Database, Json } from "@/types/database";

const PIPELINE_VERSION = "1";

type FinancialDocumentStatus = Database["public"]["Enums"]["financial_document_status"];
type RunStatus = Database["public"]["Enums"]["document_processing_run_status"];

/**
 * Pipeline de processamento assíncrono (Fase 2 — Macrofase 3-4, mescladas por
 * decisão de arquitetura: extração e interpretação rodam em sequência dentro da
 * mesma run, já que uma sem a outra não produz nada revisável). Disparado via
 * `after()` do Next.js logo após o upload (`lib/documents/processing/trigger.ts`),
 * nunca dentro do request de upload em si — precisa ser resiliente a rodar sozinho,
 * sem crashar a resposta HTTP se algo falhar no meio (ERD 2.0 §"processamento
 * assíncrono": um documento falhar nunca pode invalidar o lote inteiro).
 *
 * Usa o client Supabase normal (anon key + cookies do usuário que fez upload,
 * preservados por `after()`) — RLS continua sendo a fronteira de segurança, nunca
 * service role, mesmo em processamento de fundo.
 *
 * Documento ≠ transação: esta função NUNCA escreve em `transactions`. Ela só vai
 * até `interpreted_financial_events` — a confirmação humana (macrofases futuras)
 * é quem materializa em `import_rows` → `transactions`.
 */
export async function runDocumentProcessingPipeline(documentId: string): Promise<void> {
  const supabase = await createClient();

  const { data: doc, error: docError } = await supabase
    .from("financial_documents")
    .select("id, household_id, storage_bucket, storage_path, mime_type, document_type, status, institution_name")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    console.error(`[document-processing] documento ${documentId} não encontrado (ou sem acesso RLS):`, docError);
    return;
  }

  // Idempotência: nunca inicia uma segunda run enquanto uma já está em andamento,
  // e não reprocessa um documento que já saiu do estado inicial "received" (uma UI
  // de reprocessamento explícito fica pra uma macrofase futura).
  if (doc.status !== "received") {
    return;
  }

  const { data: existingRuns } = await supabase
    .from("document_processing_runs")
    .select("id, status")
    .eq("document_id", documentId);

  if ((existingRuns ?? []).some((r) => r.status === "queued" || r.status === "running")) {
    return;
  }

  const runId = randomUUID();
  const runNumber = (existingRuns?.length ?? 0) + 1;
  const startedAt = new Date().toISOString();

  const { error: runInsertError } = await supabase.from("document_processing_runs").insert({
    id: runId,
    document_id: documentId,
    household_id: doc.household_id,
    run_number: runNumber,
    status: "running",
    pipeline_version: PIPELINE_VERSION,
    started_at: startedAt,
  });

  if (runInsertError) {
    console.error(`[document-processing] falha ao criar run para ${documentId}:`, runInsertError);
    return;
  }

  await supabase.from("financial_documents").update({ status: "processing" }).eq("id", documentId);

  try {
    await processRun({ supabase, doc, runId });
  } catch (err) {
    console.error(`[document-processing] erro inesperado processando ${documentId}:`, err);
    await finishRun({
      supabase,
      runId,
      documentId,
      runStatus: "failed",
      documentStatus: "failed",
      errorCode: "unexpected_error",
      errorDetail: { message: err instanceof Error ? err.message : String(err) },
      metrics: {},
    });
  }

  try {
    revalidatePath("/documentos");
    revalidatePath(`/documentos/${documentId}`);
  } catch {
    // `after()` roda depois da resposta ser enviada — revalidar pode não ter efeito
    // imediato nesse contexto; a UI tem um poller leve (`ProcessingStatusPoller`)
    // como caminho garantido de atualização.
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function processRun(input: {
  supabase: SupabaseClient;
  doc: {
    id: string;
    household_id: string;
    storage_bucket: string;
    storage_path: string;
    mime_type: string;
    document_type: Database["public"]["Enums"]["document_type"];
    institution_name: string | null;
  };
  runId: string;
}) {
  const { supabase, doc, runId } = input;

  const provider = pickExtractionProvider(doc.mime_type);
  if (!provider) {
    await finishRun({
      supabase,
      runId,
      documentId: doc.id,
      runStatus: "failed",
      documentStatus: "failed",
      errorCode: "unsupported_type",
      errorDetail: { mimeType: doc.mime_type },
      metrics: {},
    });
    return;
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(doc.storage_bucket)
    .download(doc.storage_path);

  if (downloadError || !fileBlob) {
    await finishRun({
      supabase,
      runId,
      documentId: doc.id,
      runStatus: "failed",
      documentStatus: "failed",
      errorCode: "storage_download_failed",
      errorDetail: { message: downloadError?.message ?? "download vazio" },
      metrics: {},
    });
    return;
  }

  const buffer = await fileBlob.arrayBuffer();
  const extraction = await provider.extract({ buffer, mimeType: doc.mime_type, fileName: doc.storage_path });

  if (extraction.pages.length > 0) {
    await supabase.from("document_pages").insert(
      extraction.pages.map((p) => ({
        id: randomUUID(),
        run_id: runId,
        page_number: p.pageNumber,
        width: p.width,
        height: p.height,
        raw_text: p.rawText,
      })),
    );
  }

  await supabase.from("processing_artifacts").insert({
    id: randomUUID(),
    run_id: runId,
    artifact_type: "extraction_result",
    content: {
      ok: extraction.ok,
      confidence: extraction.confidence,
      reason: extraction.reason ?? null,
      note: extraction.note ?? null,
      pageCount: extraction.pages.length,
    },
  });

  if (!extraction.ok) {
    // "Sem OCR configurado" é uma limitação conhecida, não um erro de verdade — o
    // documento fica "partial" (usuário pode abrir e revisar manualmente), nunca
    // "failed" (que soa como algo quebrado).
    const isKnownLimitation = extraction.reason === "no_ocr_provider";
    await finishRun({
      supabase,
      runId,
      documentId: doc.id,
      runStatus: isKnownLimitation ? "partial" : "failed",
      documentStatus: isKnownLimitation ? "partial" : "failed",
      errorCode: extraction.reason ?? "extraction_failed",
      errorDetail: { note: extraction.note ?? null },
      metrics: { pageCount: extraction.pages.length },
      extractorProvider: extraction.providerName,
      extractorModel: extraction.providerModel ?? null,
    });
    return;
  }

  const interpreter = getInterpretationProvider();
  const candidates = interpreter.classify({ documentType: doc.document_type, pages: extraction.pages });

  let interpretedCount = 0;
  for (const candidate of candidates) {
    const extractedEventId = randomUUID();
    const { error: eventError } = await supabase.from("extracted_financial_events").insert({
      id: extractedEventId,
      run_id: runId,
      document_id: doc.id,
      household_id: doc.household_id,
      source_page: candidate.sourcePage,
      source_event_index: candidate.sourceEventIndex,
      raw_description: candidate.rawDescription,
      raw_amount: candidate.rawAmount,
      raw_date: candidate.rawDate,
      parsed_amount: candidate.parsedAmount,
      parsed_date: candidate.parsedDate,
      direction: candidate.direction,
      extraction_confidence: candidate.extractionConfidence,
      source_bbox: candidate.sourceLineY != null ? { y: candidate.sourceLineY } : null,
    });

    if (eventError) {
      console.error(`[document-processing] falha ao salvar evento extraído (${doc.id}):`, eventError);
      continue;
    }

    const draft = interpreter.interpret({ documentType: doc.document_type, candidate });
    const { error: interpretedError } = await supabase.from("interpreted_financial_events").insert({
      id: randomUUID(),
      extracted_event_id: extractedEventId,
      event_type: draft.eventType,
      amount: draft.amount,
      effective_date: draft.effectiveDate,
      merchant_normalized: draft.merchantNormalized,
      installment_current: draft.installmentCurrent,
      installment_total: draft.installmentTotal,
      interpretation_confidence: draft.interpretationConfidence,
      interpretation_version: 1,
      is_current: true,
      reason_codes: draft.reasonCodes,
    });

    if (!interpretedError) interpretedCount++;
  }

  // Detecção de instituição — só preenche o que ainda está vazio, nunca sobrescreve.
  if (!doc.institution_name) {
    const fullText = extraction.pages.map((p) => p.rawText).join("\n");
    const institution = detectInstitution(fullText);
    if (institution) {
      await supabase.from("extracted_entities").insert({
        id: randomUUID(),
        run_id: runId,
        document_id: doc.id,
        entity_type: "institution",
        raw_value: institution,
        normalized_value: institution,
        confidence: 0.6,
      });
      await supabase.from("financial_documents").update({ institution_name: institution }).eq("id", doc.id);
    }
  }

  const metrics = {
    pageCount: extraction.pages.length,
    candidateCount: candidates.length,
    interpretedCount,
  };

  const documentStatus: FinancialDocumentStatus = candidates.length === 0 ? "partial" : "ready_for_review";
  const runStatus: RunStatus = candidates.length === 0 ? "partial" : "succeeded";

  await finishRun({
    supabase,
    runId,
    documentId: doc.id,
    runStatus,
    documentStatus,
    metrics,
    extractorProvider: extraction.providerName,
    extractorModel: extraction.providerModel ?? null,
    interpreterProvider: interpreter.name,
  });
}

async function finishRun(input: {
  supabase: SupabaseClient;
  runId: string;
  documentId: string;
  runStatus: RunStatus;
  documentStatus: FinancialDocumentStatus;
  metrics: Json;
  errorCode?: string;
  errorDetail?: Json;
  extractorProvider?: string;
  extractorModel?: string | null;
  interpreterProvider?: string;
}) {
  const { supabase, runId, documentId, runStatus, documentStatus, metrics, errorCode, errorDetail } = input;

  await supabase
    .from("document_processing_runs")
    .update({
      status: runStatus,
      completed_at: new Date().toISOString(),
      metrics,
      error_code: errorCode ?? null,
      error_detail: errorDetail ?? null,
      extractor_provider: input.extractorProvider ?? null,
      extractor_model: input.extractorModel ?? null,
      interpreter_provider: input.interpreterProvider ?? null,
    })
    .eq("id", runId);

  await supabase.from("financial_documents").update({ status: documentStatus }).eq("id", documentId);
}
