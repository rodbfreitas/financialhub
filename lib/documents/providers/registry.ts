import type { DocumentExtractionProvider } from "./extraction-provider";
import type { FinancialInterpretationProvider } from "./interpretation-provider";
import { PdfTextExtractionProvider } from "./pdf-text-extraction-provider";
import { ImageNoOcrExtractionProvider } from "./image-no-ocr-provider";
import { HeuristicInterpretationProvider } from "./heuristic-interpretation-provider";

/**
 * Ponto único de registro dos providers ativos (ERD 2.0 §"Providers abstraídos").
 * O pipeline nunca importa uma implementação concreta diretamente — sempre passa
 * por aqui. Trocar/adicionar um provider (ex.: um OCR de terceiros) é só adicionar
 * uma entrada nesta lista, na ordem em que devem ser tentados.
 */
export function getExtractionProviders(): DocumentExtractionProvider[] {
  return [new PdfTextExtractionProvider(), new ImageNoOcrExtractionProvider()];
}

export function pickExtractionProvider(mimeType: string): DocumentExtractionProvider | null {
  return getExtractionProviders().find((p) => p.supports(mimeType)) ?? null;
}

export function getInterpretationProvider(): FinancialInterpretationProvider {
  return new HeuristicInterpretationProvider();
}
