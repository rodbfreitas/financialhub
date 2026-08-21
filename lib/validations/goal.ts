import * as z from "zod";
import { parseMoneyInput } from "@/lib/money";
import { positiveMoneySchema, optionalMoneySchema } from "@/lib/validations/money";

export const goalStatusOptions = ["in_progress", "completed", "paused", "cancelled"] as const;

/** valor atual pode ser 0, mas nunca negativo (diferente de `moneySchema`, que aceita negativo). */
const nonNegativeMoneySchema = z
  .string()
  .transform((raw, ctx) => {
    const parsed = parseMoneyInput(raw);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "Informe um valor válido." });
      return z.NEVER;
    }
    return parsed;
  })
  .pipe(z.number().min(0, { error: "O valor não pode ser negativo." }));

export const goalSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  targetAmount: positiveMoneySchema,
  currentAmount: nonNegativeMoneySchema,
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  monthlyContribution: optionalMoneySchema,
  profileId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  status: z.enum(goalStatusOptions, { error: "Selecione o status." }),
});

export type GoalInput = z.infer<typeof goalSchema>;
