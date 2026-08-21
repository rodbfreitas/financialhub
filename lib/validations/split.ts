import * as z from "zod";

/**
 * Divisão de uma transação entre categorias/perfis (transaction_splits). O trigger no
 * banco (validate_transaction_splits, 005_transactions.sql) exige que a soma dos
 * splits seja igual ao valor da transação, ou zero (= sem splits) — validado de novo
 * aqui no servidor antes de chamar a RPC `replace_transaction_splits` (migration 018),
 * que troca todos os splits de uma vez dentro de uma única transação SQL.
 */
export const splitLineSchema = z.object({
  profileId: z.uuid().optional(),
  categoryId: z.uuid({ error: "Selecione uma categoria." }),
  subcategoryId: z.uuid().optional(),
  amount: z.number().refine((n) => n !== 0, { error: "O valor não pode ser zero." }),
});

export const splitsSchema = z.array(splitLineSchema).max(20);

export type SplitLineInput = z.infer<typeof splitLineSchema>;
