import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

export const subscriptionFrequencyOptions = [
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "custom",
] as const;
export const subscriptionPaymentMethodOptions = ["account", "credit_card", "none"] as const;

/** `subscriptions` (ERD §30) não tem `interval` como `recurring_transactions` — só frequency. */
export const subscriptionSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Informe o nome do serviço." }).max(120),
    amount: positiveMoneySchema,
    frequency: z.enum(subscriptionFrequencyOptions, { error: "Selecione a periodicidade." }),
    nextChargeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
    profileId: z.uuid({ error: "Selecione o responsável." }),
    paymentMethod: z.enum(subscriptionPaymentMethodOptions, { error: "Selecione a forma de pagamento." }),
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

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
