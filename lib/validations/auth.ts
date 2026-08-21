import * as z from "zod";

/**
 * Regras de senha do Design System/Prompt Mestre: senha real, não decorativa.
 * Mínimo 8 caracteres, pelo menos uma letra e um número — mesma regra sugerida
 * pelo guia oficial de autenticação do Next.js (node_modules/next/dist/docs/
 * 01-app/02-guides/authentication.md).
 */
export const passwordSchema = z
  .string()
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .regex(/[a-zA-Z]/, { error: "A senha precisa ter pelo menos uma letra." })
  .regex(/[0-9]/, { error: "A senha precisa ter pelo menos um número." });

export const loginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(1, { error: "Informe sua senha." }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaCodeSchema = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "Informe o código de 6 dígitos do seu aplicativo autenticador." }),
});

export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;

const baseSignupFields = {
  name: z.string().trim().min(2, { error: "Informe seu nome." }),
  email: z.email({ error: "Informe um e-mail válido." }),
  password: passwordSchema,
};

// Sem convite: cria um household novo (owner). Signup controlado (Prompt Mestre §31)
// não significa "sem signup" — significa que quem cria sozinho vira dono do próprio
// household, e todo mundo além disso entra só por convite explícito de um admin.
export const signupNewHouseholdSchema = z.object({
  ...baseSignupFields,
  mode: z.literal("new_household"),
  householdName: z.string().trim().min(2, { error: "Dê um nome ao seu household." }),
});

// Com convite: e-mail vem travado do convite, household já existe.
export const signupInviteSchema = z.object({
  ...baseSignupFields,
  mode: z.literal("invite"),
  token: z.uuid(),
});

export const signupSchema = z.discriminatedUnion("mode", [
  signupNewHouseholdSchema,
  signupInviteSchema,
]);

export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
