import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

export const installmentSchema = z.object({
  description: z.string().trim().min(2, { error: "Informe uma descrição." }).max(120),
  totalAmount: positiveMoneySchema,
  installmentCount: z
    .string()
    .transform((raw, ctx) => {
      const n = Number(raw);
      if (!Number.isInteger(n)) {
        ctx.addIssue({ code: "custom", message: "Informe um número de parcelas válido." });
        return z.NEVER;
      }
      return n;
    })
    .pipe(
      z
        .number()
        .int()
        .min(2, { error: "Um parcelamento precisa de pelo menos 2 parcelas." })
        .max(60, { error: "Máximo de 60 parcelas." }),
    ),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
  profileId: z.uuid({ error: "Selecione o titular." }),
  creditCardId: z.uuid({ error: "Selecione o cartão." }),
  categoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  subcategoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export type InstallmentInput = z.infer<typeof installmentSchema>;
