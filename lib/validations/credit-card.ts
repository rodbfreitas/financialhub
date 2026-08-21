import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

/** PRD §14 não lista bandeiras fixas; usamos as mais comuns no Brasil + "Outra". */
export const cardBrandOptions = [
  "visa",
  "mastercard",
  "elo",
  "amex",
  "hipercard",
  "other",
] as const;

const dayOfMonthSchema = z
  .string()
  .transform((raw, ctx) => {
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Informe um dia válido." });
      return z.NEVER;
    }
    return n;
  })
  .pipe(z.number().int().min(1, { error: "Dia inválido." }).max(31, { error: "Dia inválido." }));

export const creditCardSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(60),
  institutionName: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
  brand: z.enum(cardBrandOptions, { error: "Selecione a bandeira." }),
  lastFourDigits: z
    .string()
    .trim()
    .regex(/^\d{4}$/, { error: "Informe os 4 últimos dígitos." }),
  creditLimit: positiveMoneySchema,
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  profileId: z.uuid({ error: "Selecione o titular do cartão." }),
});

export type CreditCardInput = z.infer<typeof creditCardSchema>;
