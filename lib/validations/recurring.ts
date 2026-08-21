import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

export const recurringTypeOptions = ["income", "expense"] as const;
export const recurringFrequencyOptions = [
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "custom",
] as const;
export const recurringPaymentMethodOptions = ["account", "credit_card", "none"] as const;

export const recurringSchema = z
  .object({
    type: z.enum(recurringTypeOptions, { error: "Selecione um tipo." }),
    description: z.string().trim().min(2, { error: "Informe uma descrição." }).max(120),
    amount: positiveMoneySchema,
    frequency: z.enum(recurringFrequencyOptions, { error: "Selecione a frequência." }),
    interval: z
      .string()
      .transform((raw, ctx) => {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) {
          ctx.addIssue({ code: "custom", message: "Informe um intervalo válido." });
          return z.NEVER;
        }
        return n;
      })
      .pipe(z.number().int().min(1).max(24)),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    profileId: z.uuid({ error: "Selecione o titular." }),
    paymentMethod: z.enum(recurringPaymentMethodOptions, { error: "Selecione a forma de pagamento." }),
    accountId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    creditCardId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    categoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    subcategoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod === "account" && !v.accountId) {
      ctx.addIssue({ code: "custom", message: "Selecione a conta.", path: ["accountId"] });
    }
    if (v.paymentMethod === "credit_card" && !v.creditCardId) {
      ctx.addIssue({ code: "custom", message: "Selecione o cartão.", path: ["creditCardId"] });
    }
  });

export type RecurringInput = z.infer<typeof recurringSchema>;
