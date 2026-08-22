import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

/**
 * Tipos de passivo do PRD §22 (Passivos: financiamentos; empréstimos; cartão;
 * dívidas — "cartão" já vem de `credit_card_bills`, então aqui cobrimos o resto).
 */
export const liabilityTypeOptions = ["financing", "loan", "debt"] as const;

export const liabilitySchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(120),
  type: z.enum(liabilityTypeOptions, { error: "Selecione o tipo." }),
  currentBalance: positiveMoneySchema,
  interestRate: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw || !raw.trim()) return undefined;
      const normalized = raw.trim().replace(",", ".");
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({ code: "custom", message: "Informe uma taxa válida." });
        return z.NEVER;
      }
      return parsed;
    }),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  profileId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type LiabilityInput = z.infer<typeof liabilitySchema>;
