import * as z from "zod";
import { moneySchema } from "@/lib/validations/money";

/** PRD §13 — tipos de conta. */
export const accountTypeOptions = [
  "checking",
  "savings",
  "wallet",
  "digital",
  "investment",
  "other",
] as const;

export const currencyOptions = ["BRL", "USD", "EUR"] as const;

const accountBaseSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(60),
  institutionName: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
  type: z.enum(accountTypeOptions, { error: "Selecione um tipo." }),
  profileId: z.uuid({ error: "Selecione o titular da conta." }),
  currency: z.enum(currencyOptions).default("BRL"),
});

/**
 * `currentBalance` só é aceito na criação ("saldo inicial"). Depois disso o saldo é
 * mantido automaticamente pelas transações (função `adjust_account_balance`, migration
 * 018) — editar o saldo diretamente criaria uma segunda fonte de verdade que diverge
 * do histórico de lançamentos. `updateAccountSchema` por isso não tem esse campo.
 */
export const createAccountSchema = accountBaseSchema.extend({ currentBalance: moneySchema });
export const updateAccountSchema = accountBaseSchema;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
