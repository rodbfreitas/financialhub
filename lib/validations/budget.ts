import * as z from "zod";
import { optionalMoneySchema } from "@/lib/validations/money";

export const budgetPeriodTypeOptions = ["monthly", "custom"] as const;

/**
 * Linhas de categoria do orçamento (budget_items) — o valor já chega parseado como
 * number (calculado no client, mesmo padrão de `splitLineSchema`), porque o dialog
 * monta o array e serializa como JSON num input escondido em vez de mandar campo a
 * campo (não dá pra ter um número dinâmico de campos de FormData com nome fixo).
 */
export const budgetItemLineSchema = z.object({
  categoryId: z.uuid({ error: "Selecione uma categoria." }),
  subcategoryId: z.uuid().optional(),
  plannedAmount: z.number().positive({ error: "Informe um valor válido." }),
});

const budgetItemsJsonSchema = z
  .string()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw);
    } catch {
      ctx.addIssue({ code: "custom", message: "Itens de orçamento inválidos." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(budgetItemLineSchema)
      .min(1, { error: "Adicione ao menos uma categoria." })
      .max(30),
  );

export const budgetSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Informe um nome." }).max(120),
    periodType: z.enum(budgetPeriodTypeOptions, { error: "Selecione o tipo de período." }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
    totalLimit: optionalMoneySchema,
    profileId: z
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    items: budgetItemsJsonSchema,
  })
  .refine((v) => v.endDate >= v.startDate, {
    error: "A data final precisa ser depois da inicial.",
    path: ["endDate"],
  });

export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetItemLineInput = z.infer<typeof budgetItemLineSchema>;
