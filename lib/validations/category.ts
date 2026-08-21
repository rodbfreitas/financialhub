import * as z from "zod";

/** "any" no formulário vira `type: null` no banco (categoria serve pra qualquer tipo). */
export const categoryTypeOptions = ["income", "expense", "transfer", "adjustment", "any"] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(60),
  type: z.enum(categoryTypeOptions, { error: "Selecione um tipo." }),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const subcategorySchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(60),
  categoryId: z.uuid({ error: "Categoria inválida." }),
});

export type SubcategoryInput = z.infer<typeof subcategorySchema>;
