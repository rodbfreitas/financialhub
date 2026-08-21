import * as z from "zod";
import { parseMoneyInput } from "@/lib/money";

/** Valor monetário obrigatório e diferente de zero (transações não podem ser R$ 0,00). */
export const nonZeroMoneySchema = z
  .string()
  .transform((raw, ctx) => {
    const parsed = parseMoneyInput(raw);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "Informe um valor válido." });
      return z.NEVER;
    }
    return parsed;
  })
  .pipe(z.number().refine((n) => n !== 0, { error: "O valor não pode ser zero." }));

/** Valor monetário obrigatório, pode ser zero ou negativo (ex.: saldo inicial de conta). */
export const moneySchema = z.string().transform((raw, ctx) => {
  const parsed = parseMoneyInput(raw);
  if (parsed === null) {
    ctx.addIssue({ code: "custom", message: "Informe um valor válido." });
    return z.NEVER;
  }
  return parsed;
});

/** Valor monetário positivo obrigatório (ex.: limite de cartão, valor de parcelamento). */
export const positiveMoneySchema = z
  .string()
  .transform((raw, ctx) => {
    const parsed = parseMoneyInput(raw);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "Informe um valor válido." });
      return z.NEVER;
    }
    return parsed;
  })
  .pipe(z.number().positive({ error: "O valor precisa ser maior que zero." }));

/** Valor monetário opcional (string vazia vira undefined). */
export const optionalMoneySchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw || !raw.trim()) return undefined;
    const parsed = parseMoneyInput(raw);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "Informe um valor válido." });
      return z.NEVER;
    }
    return parsed;
  });
