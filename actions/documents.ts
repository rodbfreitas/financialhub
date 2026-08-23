"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { documentUploadSchema } from "@/lib/validations/documents";
import {
  MAX_DOCUMENT_FILE_BYTES,
  MAX_DOCUMENTS_PER_BATCH,
  isAcceptedDocumentFile,
} from "@/lib/documents/mime";
import { sha256OfBuffer } from "@/lib/documents/hash";
import { triggerDocumentProcessing } from "@/lib/documents/processing/trigger";

/**
 * Fase 2 — Macrofase 2 (Prompt Mestre §21 / ERD §"Ingestão"). DocumentIngestionService:
 * valida, faz hash, envia para o Storage privado já existente (`financial-documents`,
 * criado na Etapa 9 / migration 014) e registra em `financial_documents`. Não faz
 * NENHUMA leitura de conteúdo financeiro aqui — extração/interpretação são etapas
 * assíncronas separadas (Macrofase 3-4), disparadas depois deste passo.
 *
 * Idempotência (PRD 2.0 / UX "Mesmo documento reenviado"): o par (household_id,
 * sha256) é único no banco (migration 022). Se o hash já existe, o arquivo NÃO é
 * reenviado ao Storage nem duplicado — o resultado do item aponta pro documento já
 * existente, para a tela oferecer "abrir o envio anterior" (reprocessar é uma ação
 * explícita separada, ainda não implementada nesta macrofase).
 */

export type DocumentUploadItemResult = {
  fileName: string;
  status: "uploaded" | "duplicate" | "error";
  message?: string;
  documentId?: string;
};

export type DocumentUploadState = {
  error?: string;
  results?: DocumentUploadItemResult[];
} | null;

export async function uploadDocuments(
  _prevState: DocumentUploadState,
  formData: FormData,
): Promise<DocumentUploadState> {
  const parsedFields = documentUploadSchema.safeParse({
    profileId: formData.get("profileId"),
  });
  if (!parsedFields.success) {
    return { error: "Dados de envio inválidos." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Selecione ao menos um arquivo (PDF, JPG ou PNG)." };
  }
  if (files.length > MAX_DOCUMENTS_PER_BATCH) {
    return { error: `Envie no máximo ${MAX_DOCUMENTS_PER_BATCH} arquivos por vez.` };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = parsedFields.data.profileId ?? null;
  const results: DocumentUploadItemResult[] = [];

  for (const file of files) {
    if (!isAcceptedDocumentFile(file)) {
      results.push({
        fileName: file.name,
        status: "error",
        message: "Formato não suportado. Envie PDF, JPG ou PNG.",
      });
      continue;
    }
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      results.push({ fileName: file.name, status: "error", message: "Arquivo maior que 10 MB." });
      continue;
    }

    const buffer = await file.arrayBuffer();
    const sha256 = sha256OfBuffer(buffer);

    // Checa duplicidade ANTES de subir pro Storage — nunca gasta espaço/tempo com
    // um arquivo que o household já enviou (ERD §"nunca confiar só no filename").
    const { data: existing } = await supabase
      .from("financial_documents")
      .select("id")
      .eq("household_id", householdId)
      .eq("sha256", sha256)
      .maybeSingle();

    if (existing) {
      results.push({
        fileName: file.name,
        status: "duplicate",
        message: "Este arquivo já foi enviado anteriormente.",
        documentId: existing.id,
      });
      continue;
    }

    const documentId = randomUUID();
    const storagePath = `${householdId}/documents/${documentId}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("financial-documents")
      .upload(storagePath, buffer, { contentType: file.type || undefined, upsert: false });

    if (uploadError) {
      results.push({ fileName: file.name, status: "error", message: "Não foi possível salvar o arquivo." });
      continue;
    }

    // ID gerado no cliente e sem `.select()` de volta — evita o bug conhecido de
    // RLS + RETURNING (a policy de SELECT de financial_documents depende de
    // household_id, que já está disponível aqui, mas o padrão é mantido por
    // consistência e robustez com o resto do código, ver actions/household.ts).
    const { error: insertError } = await supabase.from("financial_documents").insert({
      id: documentId,
      household_id: householdId,
      uploaded_by: user?.id ?? null,
      storage_bucket: "financial-documents",
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size_bytes: file.size,
      sha256,
      profile_id: profileId,
      status: "received",
    });

    if (insertError) {
      // Arquivo já subiu mas o registro falhou — remove o objeto órfão do Storage
      // pra não deixar lixo sem metadata associada.
      await supabase.storage.from("financial-documents").remove([storagePath]);
      results.push({ fileName: file.name, status: "error", message: "Não foi possível registrar o documento." });
      continue;
    }

    results.push({ fileName: file.name, status: "uploaded", documentId });
  }

  const uploadedIds = results
    .filter((r): r is DocumentUploadItemResult & { documentId: string } => r.status === "uploaded" && !!r.documentId)
    .map((r) => r.documentId);
  if (uploadedIds.length > 0) {
    triggerDocumentProcessing(uploadedIds);
  }

  revalidatePath("/documentos");
  return { results };
}
