import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { FormAlert } from "@/components/auth/form-field-error";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Criar conta — Financial Hub Familiar" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === "string" ? searchParams.token : undefined;

  let invite: { householdName: string; email: string; token: string } | undefined;
  let inviteError: string | undefined;

  if (token) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_invite_preview", { p_token: token })
      .maybeSingle();

    if (error || !data) {
      inviteError = "Este link de convite é inválido ou já expirou.";
    } else {
      invite = { householdName: data.household_name, email: data.email, token };
    }
  }

  return (
    <AuthShell
      title={invite ? "Você foi convidado" : "Criar sua conta"}
      description={
        invite
          ? undefined
          : "Este é um sistema privado — quem cria uma conta aqui se torna dono do próprio household."
      }
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      {inviteError ? <FormAlert>{inviteError}</FormAlert> : null}
      <SignupForm invite={invite} />
    </AuthShell>
  );
}
