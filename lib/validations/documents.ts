import * as z from "zod";

/**
 * Envio de documentos (Fase 2 — Macrofase 2). Deliberadamente minimalista (UX 2.0
 * §"guardrails": "não criar um wizard longo obrigatório antes do upload") — o único
 * campo além dos arquivos é um perfil opcional, usado só como dica inicial para a
 * interpretação; a IA/heurística pode sugerir outro perfil depois, e nada aqui é
 * definitivo até a revisão humana.
 */
export const documentUploadSchema = z.object({
  profileId: z.uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});
