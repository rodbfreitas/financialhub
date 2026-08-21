import Link from "next/link";
import type { Metadata } from "next";
import { MfaSection } from "@/components/account/mfa-section";

export const metadata: Metadata = { title: "Segurança da conta — Financial Hub Familiar" };

// Página standalone (sem shell/nav ainda — Etapa 5) — só o necessário pra gerenciar
// MFA. Quando a Application Shell existir, isto vira uma aba dentro de /account.
export default function AccountSecurityPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div>
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            ← Voltar
          </Link>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            Segurança da conta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie como você entra na sua conta.
          </p>
        </div>

        <MfaSection />
      </div>
    </div>
  );
}
