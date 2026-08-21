import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { EntityActiveToggle } from "@/components/shared/entity-active-toggle";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Badge } from "@/components/ui/badge";
import { setAccountActive } from "@/actions/accounts";
import { accountTypeOptions } from "@/lib/validations/account";

export const metadata: Metadata = { title: "Contas — Financial Hub Familiar" };

const TYPE_LABELS: Record<(typeof accountTypeOptions)[number], string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  digital: "Conta digital",
  investment: "Investimento",
  other: "Outros",
};

export default async function ContasPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const [{ data: accounts }, { data: profiles }] = await Promise.all([
    supabase
      .from("accounts")
      .select(
        "id, name, institution_name, type, currency, current_balance, active, profile_id, profiles(name)",
      )
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const profileOptions = profiles ?? [];
  const hasAccounts = !!accounts && accounts.length > 0;
  const totalBalance = (accounts ?? [])
    .filter((a) => a.active && a.currency === "BRL")
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Contas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contas bancárias, carteiras e saldos da família.
          </p>
        </div>
        <AccountFormDialog profiles={profileOptions} />
      </div>

      {hasAccounts ? (
        <>
          <div
            className="flex max-w-xs flex-col gap-1 rounded-lg border border-border bg-card p-4"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <p className="text-xs text-muted-foreground">Saldo total (BRL, contas ativas)</p>
            <MoneyDisplay amount={totalBalance} className="text-2xl font-semibold text-foreground" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Landmark className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account.institution_name ?? "—"} · {account.profiles?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <EntityActiveToggle
                    id={account.id}
                    active={account.active}
                    action={setAccountActive}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {TYPE_LABELS[account.type]}
                  </Badge>
                  <MoneyDisplay
                    amount={Number(account.current_balance)}
                    className="text-sm font-medium text-foreground"
                  />
                </div>

                <AccountFormDialog
                  account={{
                    id: account.id,
                    name: account.name,
                    institutionName: account.institution_name,
                    type: account.type,
                    profileId: account.profile_id,
                    currency: account.currency as "BRL" | "USD" | "EUR",
                    currentBalance: Number(account.current_balance),
                  }}
                  profiles={profileOptions}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          className="flex max-w-lg flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Landmark className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhuma conta cadastrada</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Cadastre suas contas bancárias, carteiras e contas digitais para começar a
            registrar transações.
          </p>
          <AccountFormDialog profiles={profileOptions} />
        </div>
      )}
    </div>
  );
}
