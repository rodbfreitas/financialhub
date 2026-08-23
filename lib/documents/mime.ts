/**
 * Formatos aceitos pelo envio de documentos (Financial Document Intelligence —
 * PRD 2.0 §"Tipos de documento suportados"): PDF, JPG, JPEG, PNG. CSV/XLS/XLSX/OFX
 * continuam exclusivos do fluxo de Importações existente (`/importar`) — não são
 * "documentos" no sentido de evidência visual, e o Prompt Mestre Fase 2 proíbe
 * quebrar esse fluxo.
 */
export const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

/** Mesmo limite por arquivo já usado em `/importar` (Etapa 9) — mantém consistência
 * de expectativa para o usuário entre os dois fluxos. */
export const MAX_DOCUMENT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Limite de arquivos por lote de envio (UX 2.0 — "Novo envio" aceita múltiplos
 * arquivos de uma vez). Decisão de implementação documentada, não fixada no PRD. */
export const MAX_DOCUMENTS_PER_BATCH = 20;

export function documentExtensionOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? `.${m[1]}` : "";
}

export function isAcceptedDocumentFile(file: { name: string; type: string }): boolean {
  const ext = documentExtensionOf(file.name);
  if (!(ACCEPTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) return false;
  // Alguns navegadores/OS não preenchem `file.type` corretamente para PDFs — quando
  // vazio, confiamos só na extensão (já validada acima); quando presente, ele precisa
  // bater com o whitelist.
  if (!file.type) return true;
  return (ACCEPTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type);
}
