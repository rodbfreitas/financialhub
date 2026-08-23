/**
 * Detecção heurística de instituição financeira a partir do texto extraído — lista
 * estática das instituições brasileiras mais comuns, extensível sem afetar o resto
 * do pipeline. Não é uma verdade absoluta (nomes podem aparecer em qualquer contexto
 * no documento), por isso só preenche `financial_documents.institution_name` quando
 * ele ainda está vazio, e sempre soma um registro em `extracted_entities` para
 * auditoria/revisão — nunca sobrescreve algo que já foi definido por outra etapa.
 */
const KNOWN_INSTITUTIONS = [
  "Nubank",
  "Itaú",
  "Itau",
  "Bradesco",
  "Santander",
  "Banco do Brasil",
  "Caixa Econômica",
  "Caixa Econômica Federal",
  "Banco Inter",
  "C6 Bank",
  "BTG Pactual",
  "PicPay",
  "Mercado Pago",
  "Next",
  "Neon",
  "Original",
  "Sicoob",
  "Sicredi",
  "XP Investimentos",
  "Will Bank",
  "PagBank",
  "PagSeguro",
] as const;

export function detectInstitution(fullText: string): string | null {
  for (const name of KNOWN_INSTITUTIONS) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
    if (re.test(fullText)) return name;
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
