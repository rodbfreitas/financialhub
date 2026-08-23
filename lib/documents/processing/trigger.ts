import "server-only";
import { after } from "next/server";
import { runDocumentProcessingPipeline } from "./pipeline";

/**
 * Dispara o processamento assíncrono (Macrofase 3-4) sem bloquear a resposta do
 * upload — usa `after()` do Next.js, que roda dentro do mesmo request e preserva
 * `cookies()`, então a extração usa o MESMO client Supabase (anon key + sessão do
 * usuário), nunca service role. Chamado a partir de `actions/documents.ts` logo
 * após cada documento ser registrado com sucesso.
 *
 * Falha de um documento nunca derruba os outros (ERD 2.0 §"processamento
 * assíncrono") — cada `runDocumentProcessingPipeline` roda isolado, com seu
 * próprio try/catch interno.
 */
export function triggerDocumentProcessing(documentIds: string[]) {
  for (const documentId of documentIds) {
    after(async () => {
      try {
        await runDocumentProcessingPipeline(documentId);
      } catch (err) {
        console.error(`[document-processing] falha inesperada disparando ${documentId}:`, err);
      }
    });
  }
}
