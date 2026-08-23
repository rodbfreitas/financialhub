import type { DocumentExtractionProvider, ExtractionResult } from "./extraction-provider";

/**
 * Placeholder honesto para imagens (JPG/PNG). Este ambiente não tem nenhum provider
 * de OCR/IA configurado — em vez de fingir extração ou bloquear o envio, o pipeline
 * registra a limitação de forma explícita (`reason: "no_ocr_provider"`) e o documento
 * fica com status "partial": o usuário pode abrir o comprovante, ver a imagem original
 * e revisar manualmente. Basta implementar um novo `DocumentExtractionProvider` (ex.:
 * um vendor de OCR) e registrá-lo em `providers/registry.ts` para este placeholder
 * parar de ser usado — nenhuma outra parte do pipeline muda.
 */
export class ImageNoOcrExtractionProvider implements DocumentExtractionProvider {
  readonly name = "image-no-ocr-placeholder";

  supports(mimeType: string): boolean {
    return mimeType === "image/jpeg" || mimeType === "image/png";
  }

  async extract(): Promise<ExtractionResult> {
    return {
      ok: false,
      confidence: 0,
      pages: [],
      reason: "no_ocr_provider",
      note: "Extração automática de imagens requer um provider de OCR, ainda não configurado neste ambiente.",
      providerName: this.name,
    };
  }
}
