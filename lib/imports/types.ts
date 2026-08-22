/**
 * Tipos compartilhados do pipeline de importação (Etapa 9, Prompt Mestre §25-27,
 * PRD §23-24): UPLOAD → PROCESSAMENTO → STAGING (import_rows) → REVISÃO →
 * CONFIRMAÇÃO → transactions. Nunca inserir direto em `transactions` a partir de um
 * arquivo — tudo passa por `import_rows` primeiro.
 */

/** Grade bruta extraída de um CSV/XLS/XLSX: cabeçalho + linhas de células como texto. */
export type ParsedGrid = {
  headers: string[];
  rows: string[][];
};

/**
 * Como o usuário (ou a detecção automática) mapeou as colunas da grade pros campos
 * que uma transação precisa. PRD §24: "Quando não conseguir [detectar sozinho]:
 * Mapeamento de colunas ... O usuário confirma antes da importação."
 */
export type ColumnMapping =
  | { mode: "signed"; dateColumn: string; descriptionColumn: string; amountColumn: string }
  | { mode: "allExpense"; dateColumn: string; descriptionColumn: string; amountColumn: string }
  | { mode: "allIncome"; dateColumn: string; descriptionColumn: string; amountColumn: string }
  | {
      mode: "debitCredit";
      dateColumn: string;
      descriptionColumn: string;
      debitColumn: string;
      creditColumn: string;
    };

/** Resultado da tentativa de detecção automática de colunas. */
export type ColumnDetection =
  | { confident: true; mapping: ColumnMapping }
  | { confident: false; suggestion: Partial<ColumnMapping> | null };

/** Uma linha já normalizada, pronta para virar `import_rows` (ou já com erro). */
export type ParsedTransactionRow = {
  rawData: Record<string, unknown>;
  parsedDate: string | null;
  parsedDescription: string | null;
  /** Assinado: negativo = despesa, positivo = receita (convenção OFX/extrato). */
  parsedAmount: number | null;
  externalId?: string | null;
  error?: string;
};
