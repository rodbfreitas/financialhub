import * as z from "zod";
import { positiveMoneySchema } from "@/lib/validations/money";

export const transferSchema = z
  .object({
    description: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : "Transferência entre contas")),
    amount: positiveMoneySchema,
    transactionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." }),
    profileId: z.uuid({ error: "Selecione o titular." }),
    fromAccountId: z.uuid({ error: "Selecione a conta de origem." }),
    toAccountId: z.uuid({ error: "Selecione a conta de destino." }),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    error: "A conta de origem e destino devem ser diferentes.",
    path: ["toAccountId"],
  });

export type TransferInput = z.infer<typeof transferSchema>;
