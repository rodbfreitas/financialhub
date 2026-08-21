import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Conta — Financial Hub Familiar" };

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = (user.user_metadata?.full_name as string | undefined)?.trim() || "—";
  const memberSince = new Date(user.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Configurações
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seus dados de login.</p>
      </div>

      <div
        className="max-w-md divide-y divide-border rounded-lg border border-border bg-card"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <dl className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Nome</dt>
          <dd className="text-sm font-medium text-foreground">{name}</dd>
        </dl>
        <dl className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">E-mail</dt>
          <dd className="text-sm font-medium text-foreground">{user.email}</dd>
        </dl>
        <dl className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">E-mail confirmado</dt>
          <dd className="text-sm font-medium text-foreground">
            {user.email_confirmed_at ? "Sim" : "Não"}
          </dd>
        </dl>
        <dl className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Conta criada em</dt>
          <dd className="text-sm font-medium text-foreground">{memberSince}</dd>
        </dl>
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <Link
          href="/auth/update-password"
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-secondary"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          Alterar senha
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          href="/configuracoes/seguranca"
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-secondary"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          Verificação em duas etapas (MFA)
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
