/**
 * Fórmulas de equivalência mensal/anual de assinaturas — extraídas da página de
 * Assinaturas (Etapa 8) pra reuso no relatório de Assinaturas (Etapa 10). Mesma
 * fórmula da view `subscription_summary` (013_views_and_rpc.sql), mas calculada no
 * client/server a partir das linhas já filtradas por perfil (a view é household-wide,
 * sem filtro de perfil).
 */

export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "quarterly":
      return amount / 3;
    case "semiannual":
      return amount / 6;
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}

export function annualEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return amount * 52;
    case "quarterly":
      return amount * 4;
    case "semiannual":
      return amount * 2;
    case "annual":
      return amount;
    default:
      return amount * 12;
  }
}
