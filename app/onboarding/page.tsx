import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { finalizeHouseholdSetup } from "@/actions/household";
import { AuthShell } from "@/components/auth/auth-shell";
import { CreateHouseholdForm } from "@/components/auth/create-household-form";
import { FormAlert } from "@/components/auth/form-field-error";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = { title: "Configurando sua conta — Financial Hub Familiar" };

/**
 * Ponto de passagem pós-login/pós-confirmação de e-mail: nunca é um destino em si.
 * finalizeHouseholdSetup() resolve a intenção do signup (household novo ou convite)
 * salva em user_metadata; se já resolvida (ou o usuário já pertence a um household),
 * segue direto pra "/". Só renderiza algo quando não há intenção salva pra resolver
 * automaticamente (needs_setup) ou quando algo deu errado (error).
 */
export default async function OnboardingPage() {
  const result = await finalizeHouseholdSetup();

  switch (result.status) {
    case "already_member":
    case "created":
    case "joined":
      redirect("/");
    case "needs_setup":
      return (
        <AuthShell
          title="Falta um passo"
          description="Não encontramos um household vinculado à sua conta. Crie um agora para continuar — você será o dono."
          footer={<LogoutButton />}
        >
          <CreateHouseholdForm />
        </AuthShell>
      );
    case "error":
      return (
        <AuthShell title="Algo deu errado" footer={<LogoutButton />}>
          <FormAlert>
            Não foi possível concluir a configuração da sua conta. Tente novamente em
            alguns instantes ou entre em contato com o suporte.
          </FormAlert>
        </AuthShell>
      );
  }
}
