import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

/**
 * Núcleo de transações (Etapa 6 / Tarefa #27): receita, despesa e ajuste. Transferência
 * (par de lançamentos entre contas/perfis) é implementada na Tarefa #28 com uma action
 * dedicada, por isso não aparece aqui.
 */
export const transactionTypeOptions = ["income", "expense", "adjustment"] as const;
export const transactionStatusOptions = ["posted", "pending", "planned", "cancelled"] as const;
export const transactionNatureOptions = ["individual", "shared"] as const;
export const paymentMethodOptions = ["account", "credit_card", "none"] as const;

export const transactionSchema = z
  .object({
    type: z.enum(transactionTypeOptions, { error: "Selecione um tipo." }),
    description: z.string().trim().min(2, { error: "Informe uma descrição." }).max(120),
    merchant: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v ? v : undefined)),
    amount: positiveMoneySchema,
    transactionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
    status: z.enum(transactionStatusOptions).default("posted"),
    nature: z.enum(transactionNatureOptions).default("individual"),
    profileId: z.uuid({ error: "Selecione o titular." }),
    paymentMethod: z.enum(paymentMethodOptions, { error: "Selecione a forma de pagamento." }),
    accountId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    creditCardId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    categoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    subcategoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod === "account" && !v.accountId) {
      ctx.addIssue({ code: "custom", message: "Selecione a conta.", path: ["accountId"] });
    }
    if (v.paymentMethod === "credit_card" && !v.creditCardId) {
      ctx.addIssue({ code: "custom", message: "Selecione o cartão.", path: ["creditCardId"] });
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;
