import * as z from "zod";

/**
 * Usado só pelo fallback de /onboarding (status "needs_setup" — conta sem intenção
 * de signup salva em user_metadata, ex.: fluxo interrompido ou conta antiga). O
 * caminho normal (criar household no signup, ou aceitar convite) não passa por aqui.
 */
export const createHouseholdSchema = z.object({
  householdName: z.string().trim().min(2, { error: "Dê um nome ao seu household." }),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
