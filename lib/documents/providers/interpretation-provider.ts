import type { Database } from "@/types/database";
import type { ExtractedPage } from "./extraction-provider";

type DocumentType = Database["public"]["Enums"]["document_type"];
type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];

/**
 * Fase 2 — Macrofase 3-4 (ERD 2.0 §"Providers abstraídos"). `FinancialInterpretationProvider`
 * tem duas responsabilidades separadas, na mesma ordem do domínio (ERD §"camadas"):
 *
 * 1. `classify` — varre o texto já extraído e encontra CANDIDATOS a evento financeiro
 *    (linha com data + valor reconhecíveis). Isso povoa `extracted_financial_events`
 *    (camada "Original" — dados brutos, auditáveis, nunca interpretados).
 * 2. `interpret` — para cada candidato já persistido, sugere um evento financeiro
 *    estruturado (tipo, valor, data, parcelamento). Isso povoa
 *    `interpreted_financial_events` (camada "Interpretado" — ainda não é transação;
 *    só vira transação depois de revisão humana confirmar, via `import_rows`).
 *
 * A primeira implementação real (`HeuristicInterpretationProvider`) é baseada em
 * regex/palavras-chave para o formato de data e moeda brasileiro — sem IA/LLM. Pode
 * ser trocada por um provider de IA depois implementando a mesma interface.
 */

export type ClassifiedEventCandidate = {
  sourcePage: number;
  sourceEventIndex: number;
  rawDescription: string | null;
  rawAmount: string | null;
  rawDate: string | null;
  direction: "debit" | "credit" | null;
  parsedAmount: number | null;
  /** ISO yyyy-mm-dd */
  parsedDate: string | null;
  extractionConfidence: number;
  sourceLineY?: number;
};

export type InterpretedEventDraft = {
  eventType: FinancialEventType;
  amount: number | null;
  effectiveDate: string | null;
  merchantNormalized: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  interpretationConfidence: number;
  reasonCodes: string[];
};

export interface FinancialInterpretationProvider {
  readonly name: string;
  classify(input: { documentType: DocumentType; pages: ExtractedPage[] }): ClassifiedEventCandidate[];
  interpret(input: { documentType: DocumentType; candidate: ClassifiedEventCandidate }): InterpretedEventDraft;
}
