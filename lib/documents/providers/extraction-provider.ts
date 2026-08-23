/**
 * Fase 2 — Macrofase 3 (ERD 2.0 §"Providers abstraídos"). Contrato que qualquer
 * extrator de conteúdo de documento precisa implementar. O pipeline
 * (`lib/documents/processing/pipeline.ts`) NUNCA fala diretamente com uma
 * biblioteca/vendor de OCR/IA — ele só conhece esta interface. Isso permite
 * trocar ou adicionar providers (ex.: um OCR de terceiros para imagens) sem
 * mudar o resto do pipeline.
 *
 * A primeira implementação real (`PdfTextExtractionProvider`) é determinística:
 * extrai o texto nativo já embutido no PDF, sem OCR. Documentos que dependem de
 * OCR (imagens, PDFs escaneados sem camada de texto) ainda não têm provider
 * configurado neste ambiente — o resultado é reportado honestamente como tal
 * (`reason: "no_ocr_provider"`), nunca com conteúdo inventado.
 */

export type ExtractedLine = {
  pageNumber: number;
  text: string;
  /** Posição vertical dentro da página, só para heurísticas de agrupamento/ordem — nunca para layout visual. */
  y?: number;
};

export type ExtractedPage = {
  pageNumber: number;
  width: number | null;
  height: number | null;
  rawText: string;
  lines: ExtractedLine[];
};

export type ExtractionFailureReason =
  | "unsupported_type"
  | "no_ocr_provider"
  | "unreadable_content"
  | "empty_content"
  | "provider_error";

export type ExtractionResult = {
  /** false quando o provider não conseguiu extrair conteúdo confiável (nunca inventa dado). */
  ok: boolean;
  /** 0 a 1 — confiança geral da extração, refletida honestamente na UI (Design System 2.0 proíbe score fantasioso). */
  confidence: number;
  pages: ExtractedPage[];
  /** Presente só quando ok=false — motivo estruturado (não é a mensagem final ao usuário, essa é decidida na UI). */
  reason?: ExtractionFailureReason;
  /** Detalhe legível para logging/auditoria. */
  note?: string;
  providerName: string;
  providerModel?: string;
};

export interface DocumentExtractionProvider {
  readonly name: string;
  /** Indica se este provider consegue tentar extrair o mime type informado. */
  supports(mimeType: string): boolean;
  extract(input: { buffer: ArrayBuffer; mimeType: string; fileName: string }): Promise<ExtractionResult>;
}
