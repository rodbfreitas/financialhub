import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

/**
 * Tipos de ativo do PRD §22 (Ativos: contas; investimentos; imóveis; veículos;
 * outros — "contas" já é a tabela `accounts`, então aqui cobrimos o resto).
 */
export const assetTypeOptions = ["investment", "real_estate", "vehicle", "other"] as const;

export const assetSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(120),
  type: z.enum(assetTypeOptions, { error: "Selecione o tipo." }),
  currentValue: positiveMoneySchema,
  valuationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
  profileId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type AssetInput = z.infer<typeof assetSchema>;
