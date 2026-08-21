import * as z from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe um nome." }).max(60),
  type: z.enum(["individual", "shared"], { error: "Selecione um tipo de perfil." }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
