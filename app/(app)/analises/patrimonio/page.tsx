import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet, Landmark, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { formatMoney } from "@/lib/money";
import { AssetFormDialog, ASSET_TYPE_LABELS } from "@/components/assets/asset-form-dialog";
import { DeleteAssetButton } from "@/components/assets/delete-asset-button";
import { LiabilityFormDialog, LIABILITY_TYPE_LABELS } from "@/components/liabilities/liability-form-dialog";
import { DeleteLiabilityButton } from "@/components/liabilities/delete-liability-button";
import { NetWorthTrendChart, type NetWorthPoint } from "@/components/reports/net-worth-trend-chart";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Patrimônio — Financial Hub Familiar" };

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function PatrimonioPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  // Atualiza o snapshot de hoje antes de ler o histórico (021_net_worth_snapshots.sql)
  // — assim o gráfico e os totais desta visita já refletem o estado atual, mesmo que
  // nada tenha mudado desde a última vez.
  await supabase.rpc("snapshot_net_worth", { p_household_id: householdId });

  const [{ data: accounts }, { data: assets }, { data: billsOpen }, { data: liabilities }, { data: profiles }, { data: snapshots }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, current_balance, institution_name")
        .eq("household_id", householdId)
        .eq("active", true)
        .eq("currency", "BRL")
        .is("deleted_at", null)
        .order("current_balance", { ascending: false }),
      supabase
        .from("assets")
        .select("id, name, type, current_value, valuation_date, profile_id, profiles(name)")
        .eq("household_id", householdId)
        .order("current_value", { ascending: false }),
      supabase
        .from("credit_card_bills")
        .select("id, total_amount, status, credit_cards(name)")
        .eq("household_id", householdId)
        .in("status", ["open", "closed", "overdue"]),
      supabase
        .from("liabilities")
        .select("id, name, type, current_balance, interest_rate, due_date, profile_id, profiles(name)")
        .eq("household_id", householdId)
        .order("current_balance", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, name")
        .eq("household_id", householdId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("net_worth_snapshots")
        .select("snapshot_date, total_accounts, total_assets, total_credit_card_debt, total_liabilities, net_worth")
        .eq("household_id", householdId)
        .order("snapshot_date", { ascending: true })
        .limit(365),
    ]);

  const totalAccounts = (accounts ?? []).reduce((sum, a) => sum + Number(a.current_balance), 0);
  const totalAssets = (assets ?? []).reduce((sum, a) => sum + Number(a.current_value), 0);
  const totalCreditCardDebt = (billsOpen ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalLiabilities = (liabilities ?? []).reduce((sum, l) => sum + Number(l.current_balance), 0);

  const totalActive = totalAccounts + totalAssets;
  const totalPassive = totalCreditCardDebt + totalLiabilities;
  const netWorth = totalActive - totalPassive;

  const trend: NetWorthPoint[] = (snapshots ?? []).map((s) => ({
    date: s.snapshot_date,
    label: new Date(s.snapshot_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    totalAccounts: Number(s.total_accounts),
    totalAssets: Number(s.total_assets),
    totalCreditCardDebt: Number(s.total_credit_card_debt),
    totalLiabilities: Number(s.total_liabilities),
    netWorth: Number(s.net_worth),
  }));

  const profileOptions = profiles ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Patrimônio</h1>
        <p className="text-sm text-muted-foreground">Ativos, passivos e patrimônio líquido — PRD §22.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-positive/10 text-positive">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de ativos</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(totalActive)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-negative/10 text-negative">
              <TrendingDown className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de passivos</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(totalPassive)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patrimônio líquido</p>
              <p className={`text-lg font-semibold tabular-nums ${netWorth >= 0 ? "text-positive" : "text-negative"}`}>
                {formatMoney(netWorth)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Evolução do patrimônio líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <NetWorthTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium text-foreground">Ativos</CardTitle>
            <AssetFormDialog profiles={profileOptions} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Landmark className="size-3.5" /> Contas ({formatMoney(totalAccounts)})
              </div>
              {(accounts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta ativa.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {(accounts ?? []).map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{a.name}</span>
                      <MoneyDisplay amount={Number(a.current_balance)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(assets ?? []).length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Outros ativos ({formatMoney(totalAssets)})
                </div>
                <ul className="flex flex-col gap-2">
                  {(assets ?? []).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{a.name}</span>
                          <Badge variant="outline">{ASSET_TYPE_LABELS[a.type as keyof typeof ASSET_TYPE_LABELS]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Avaliado em {formatDate(a.valuation_date)}
                          {a.profiles ? ` · ${(a.profiles as { name: string }).name}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <MoneyDisplay amount={Number(a.current_value)} className="mr-1" />
                        <AssetFormDialog
                          profiles={profileOptions}
                          asset={{
                            id: a.id,
                            name: a.name,
                            type: a.type as "investment" | "real_estate" | "vehicle" | "other",
                            currentValue: Number(a.current_value),
                            valuationDate: a.valuation_date,
                            profileId: a.profile_id,
                          }}
                        />
                        <DeleteAssetButton id={a.id} name={a.name} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium text-foreground">Passivos</CardTitle>
            <LiabilityFormDialog profiles={profileOptions} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Faturas de cartão em aberto ({formatMoney(totalCreditCardDebt)})
              </div>
              {(billsOpen ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma fatura em aberto.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {(billsOpen ?? []).map((b) => (
                    <li key={b.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{(b.credit_cards as { name: string } | null)?.name ?? "Cartão"}</span>
                      <MoneyDisplay amount={-Number(b.total_amount)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(liabilities ?? []).length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Outros passivos ({formatMoney(totalLiabilities)})
                </div>
                <ul className="flex flex-col gap-2">
                  {(liabilities ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{l.name}</span>
                          <Badge variant="outline">{LIABILITY_TYPE_LABELS[l.type as keyof typeof LIABILITY_TYPE_LABELS]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {l.interest_rate ? `${Number(l.interest_rate).toFixed(2)}% a.m.` : "Sem taxa informada"}
                          {l.due_date ? ` · vence em ${formatDate(l.due_date)}` : ""}
                          {l.profiles ? ` · ${(l.profiles as { name: string }).name}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <MoneyDisplay amount={-Number(l.current_balance)} className="mr-1" />
                        <LiabilityFormDialog
                          profiles={profileOptions}
                          liability={{
                            id: l.id,
                            name: l.name,
                            type: l.type as "financing" | "loan" | "debt",
                            currentBalance: Number(l.current_balance),
                            interestRate: l.interest_rate !== null ? Number(l.interest_rate) : null,
                            dueDate: l.due_date,
                            profileId: l.profile_id,
                          }}
                        />
                        <DeleteLiabilityButton id={l.id} name={l.name} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
