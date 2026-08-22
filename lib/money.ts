/**
 * Dinheiro é sempre NUMERIC(15,2) no banco (Prompt Mestre: nunca float) e sempre
 * formatado no padrão brasileiro na tela (Design System §13/60): "R$ 18.742,35".
 * Os formulários usam um campo de texto livre (não <input type="number">, que tem
 * comportamento de locale inconsistente entre navegadores) e `parseMoneyInput` aceita
 * tanto "1234.56" quanto "1.234,56" ou "1234,56".
 */

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoney(amount: number): string {
  return BRL_FORMATTER.format(amount);
}

/** Formata sempre com sinal (+/-) — Design System §27, "não depender apenas da cor". */
export function formatSignedMoney(amount: number): string {
  const formatted = BRL_FORMATTER.format(Math.abs(amount));
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `− ${formatted}`;
  return formatted;
}

/**
 * Converte a entrada de um campo de texto em número. Aceita "1234.56", "1234,56" e
 * "1.234,56". Retorna null se não for um número válido.
 */
export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/[^\d,.-]/g, "");

  // Bug real encontrado na Etapa 12 (QA), via teste unitário: uma entrada sem nenhum
  // dígito ("abc", "R$", "N/A") sobrevive ao replace acima como string vazia, e
  // `Number("")` é 0 em JavaScript (não NaN) — sem essa guarda, `parseMoneyInput`
  // devolvia 0 silenciosamente pra qualquer lixo digitado, em vez de null. Isso deixava
  // passar valores inválidos sem erro de validação em `moneySchema`/`optionalMoneySchema`
  // (ex.: saldo inicial de conta, limite de orçamento) — o campo virava "R$ 0,00" sem
  // avisar o usuário que o valor não foi entendido.
  if (!/\d/.test(normalized)) return null;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // "1.234,56" -> "1234.56"
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // "1234,56" -> "1234.56"
    normalized = normalized.replace(",", ".");
  }
  // só ponto ("1234.56") já está no formato certo

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
