"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/get-origin";
import {
  loginSchema,
  mfaCodeSchema,
  signupSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  mfa?: { factorId: string };
} | null;

/**
 * Login com e-mail/senha. Se o usuário tiver um fator MFA verificado, não redireciona
 * ainda — devolve mfa.factorId pro formulário renderizar o passo de código de 6
 * dígitos inline, sem sair da tela de login (evita deixar a sessão "pela metade"
 * navegável antes do aal2 ser satisfeito).
 */
export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp.find((f) => f.status === "verified");

    if (totpFactor) {
      return { mfa: { factorId: totpFactor.id } };
    }
  }

  const next = String(formData.get("next") ?? "/onboarding");
  redirect(next);
}

/** Segunda etapa do login quando MFA está ativado: valida o código TOTP de 6 dígitos. */
export async function verifyMfaChallenge(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = mfaCodeSchema.safeParse({
    factorId: formData.get("factorId"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      mfa: { factorId: String(formData.get("factorId") ?? "") },
    };
  }

  const supabase = await createClient();
  const { factorId, code } = parsed.data;

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    return { error: "Não foi possível iniciar a verificação. Tente novamente.", mfa: { factorId } };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return { error: "Código inválido ou expirado.", mfa: { factorId } };
  }

  const next = String(formData.get("next") ?? "/onboarding");
  redirect(next);
}

/**
 * Signup controlado (Prompt Mestre §31): sem convite, a pessoa cria seu próprio
 * household (owner). Com convite (?token=), o e-mail já vem travado pelo convite e a
 * membership só é efetivada depois da confirmação de e-mail (ver /onboarding).
 * A intenção (nome do household OU token de convite) viaja em user_metadata porque,
 * até o e-mail ser confirmado, não existe sessão com auth.uid() válido pra já criar
 * o household/aceitar o convite.
 */
export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const mode = formData.get("mode");

  const parsed = signupSchema.safeParse(
    mode === "invite"
      ? {
          mode: "invite",
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          token: formData.get("token"),
        }
      : {
          mode: "new_household",
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          householdName: formData.get("householdName"),
        },
  );

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const metadata: Record<string, string> =
    parsed.data.mode === "invite"
      ? { full_name: parsed.data.name, pending_invite_token: parsed.data.token }
      : { full_name: parsed.data.name, pending_household_name: parsed.data.householdName };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: metadata,
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered") || error.code === "user_already_exists") {
      return { error: "Já existe uma conta com este e-mail. Tente entrar." };
    }
    return { error: "Não foi possível criar sua conta. Tente novamente." };
  }

  // Se a confirmação de e-mail estiver desligada no projeto Supabase, signUp já
  // devolve uma sessão ativa — não faz sentido mandar a pessoa "checar o e-mail".
  if (data.session) {
    redirect("/onboarding");
  }

  return {
    success:
      "Quase lá! Enviamos um link de confirmação para o seu e-mail — clique nele para ativar sua conta.",
  };
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  // Não revela se o e-mail existe ou não (evita user enumeration) — mesma mensagem
  // de sucesso em ambos os casos, alinhado ao comportamento padrão do Supabase Auth.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });

  return {
    success: "Se este e-mail tiver uma conta, enviamos um link para redefinir a senha.",
  };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sua sessão de redefinição de senha expirou. Solicite um novo link." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "Não foi possível atualizar a senha. Tente novamente." };
  }

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
