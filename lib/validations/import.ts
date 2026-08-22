import * as z from "zod";

/**
 * Upload de importação (Etapa 9): destino é sempre uma conta OU um cartão (nunca os
 * dois, nunca nenhum) — um extrato importado é sempre de uma origem só. O perfil de
 * cada linha é sugerido a partir do dono da conta/cartão (profile_id é NOT NULL em
 * accounts/credit_cards), então não precisa ser escolhido aqui.
 */
export const importDestinationOptions = ["account", "credit_card"] as const;

export const importUploadSchema = z
  .object({
    destination: z.enum(importDestinationOptions, { error: "Selecione a conta ou o cartão." }),
    accountId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    creditCardId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  })
  .superRefine((v, ctx) => {
    if (v.destination === "account" && !v.accountId) {
      ctx.addIssue({ code: "custom", message: "Selecione a conta.", path: ["accountId"] });
    }
    if (v.destination === "credit_card" && !v.creditCardId) {
      ctx.addIssue({ code: "custom", message: "Selecione o cartão.", path: ["creditCardId"] });
    }
  });

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".xls", ".xlsx", ".ofx", ".pdf"] as const;

/** Mapeamento manual de colunas, enviado como JSON num campo hidden (PRD §24). */
export const columnMappingSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("signed"),
    dateColumn: z.string().min(1),
    descriptionColumn: z.string().min(1),
    amountColumn: z.string().min(1),
  }),
  z.object({
    mode: z.literal("allExpense"),
    dateColumn: z.string().min(1),
    descriptionColumn: z.string().min(1),
    amountColumn: z.string().min(1),
  }),
  z.object({
    mode: z.literal("allIncome"),
    dateColumn: z.string().min(1),
    descriptionColumn: z.string().min(1),
    amountColumn: z.string().min(1),
  }),
  z.object({
    mode: z.literal("debitCredit"),
    dateColumn: z.string().min(1),
    descriptionColumn: z.string().min(1),
    debitColumn: z.string().min(1),
    creditColumn: z.string().min(1),
  }),
]);

/** Uma linha editada pelo usuário na tela de revisão, enviada em lote na confirmação. */
export const importRowDecisionSchema = z.object({
  id: z.uuid(),
  include: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida." }),
  description: z.string().trim().min(1).max(160),
  amount: z.number().refine((n) => n !== 0, { error: "O valor não pode ser zero." }), // assinado: negativo = despesa, positivo = receita
  profileId: z.uuid(),
  categoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  subcategoryId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export const confirmImportSchema = z.object({
  importId: z.uuid(),
  rows: z.array(importRowDecisionSchema).min(1),
});
