import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Repeat, Wallet, CalendarClock, Hash } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { PROFILE_COOKIE, parseProfileCookie } from "@/lib/filters";
import { SubscriptionFormDialog } from "@/components/subscriptions/subscription-form-dialog";
import { EntityActiveToggle } from "@/components/shared/entity-active-toggle";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setSubscriptionActive } from "@/actions/subscriptions";
import { subscriptionFrequencyOptions } from "@/lib/validations/subscription";

export const metadata: Metadata = { title: "Assinaturas — Financial Hub Familiar" };

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

/** Mesma fórmula da view `subscription_summary` (013_views_and_rpc.sql). */
function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "quarterly":
      return amount / 3;
    case "semiannual":
      return amount / 6;
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}

function annualEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return amount * 52;
    case "quarterly":
      return amount * 4;
    case "semiannual":
      return amount * 2;
    case "annual":
      return amount;
    default:
      return amount * 12;
  }
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AssinaturasPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const profileFilter = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);

  let query = supabase
    .from("subscriptions")
    .select(
      "id, name, amount, frequency, next_charge_date, active, profile_id, account_id, credit_card_id, category_id, subcategory_id, profiles(name), categories(name), accounts(name), credit_cards(name)",
    )
    .eq("household_id", householdId)
    .order("active", { ascending: false })
    .order("next_charge_date", { ascending: true });

  if (profileFilter !== "all") query = query.eq("profile_id", profileFilter);

  const [{ data: subscriptions }, { data: profiles }, { data: accounts }, { data: creditCards }, { data: categories }] =
    await Promise.all([
      query,
      supabase
        .from("profiles")
        .select("id, name")
        .eq("household_id", householdId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("accounts")
        .select("id, name")
        .eq("household_id", householdId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("credit_cards")
        .select("id, name")
        .eq("household_id", householdId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, subcategories(id, name)")
        .eq("household_id", householdId)
        .eq("active", true)
        .order("display_order", { ascending: true }),
    ]);

  const profileOptions = profiles ?? [];
  const accountOptions = accounts ?? [];
  const creditCardOptions = creditCards ?? [];
  const categoryOptions = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));

  const activeSubs = (subscriptions ?? []).filter((s) => s.active);
  const monthlyCost = activeSubs.reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.frequency), 0);
  const annualCost = activeSubs.reduce((sum, s) => sum + annualEquivalent(Number(s.amount), s.frequency), 0);
  const hasSubscriptions = !!subscriptions && subscriptions.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">
            Central de assinaturas — identifique despesas recorrentes pouco utilizadas.
          </p>
        </div>
        <SubscriptionFormDialog
          profiles={profileOptions}
          accounts={accountOptions}
          creditCards={creditCardOptions}
          categories={categoryOptions}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-4" />
              <span className="text-sm font-medium">Custo mensal</span>
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              <MoneyDisplay amount={monthlyCost} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4" />
              <span className="text-sm font-medium">Custo anual projetado</span>
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              <MoneyDisplay amount={annualCost} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hash className="size-4" />
              <span className="text-sm font-medium">Assinaturas ativas</span>
            </div>
            <div className="text-2xl font-semibold tabular-nums">{activeSubs.length}</div>
          </CardContent>
        </Card>
      </div>

      {!hasSubscriptions ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Repeat className="size-8" />
            <p>Nenhuma assinatura cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {(subscriptions ?? []).map((sub) => (
            <Card key={sub.id} className={!sub.active ? "opacity-60" : undefined}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{sub.name}</p>
                    {sub.categories?.name ? <Badge variant="secondary">{sub.categories.name}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sub.profiles?.name ?? "—"} · {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency} · próxima
                    cobrança {formatDate(sub.next_charge_date)}
                    {sub.accounts?.name ? ` · ${sub.accounts.name}` : ""}
                    {sub.credit_cards?.name ? ` · ${sub.credit_cards.name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <MoneyDisplay amount={Number(sub.amount)} className="font-medium" />
                  <EntityActiveToggle id={sub.id} active={sub.active} action={setSubscriptionActive} />
                  <SubscriptionFormDialog
                    subscription={{
                      id: sub.id,
                      name: sub.name,
                      amount: Number(sub.amount),
                      frequency: sub.frequency as (typeof subscriptionFrequencyOptions)[number],
                      nextChargeDate: sub.next_charge_date,
                      profileId: sub.profile_id,
                      paymentMethod: sub.account_id ? "account" : sub.credit_card_id ? "credit_card" : "none",
                      accountId: sub.account_id,
                      creditCardId: sub.credit_card_id,
                      categoryId: sub.category_id,
                      subcategoryId: sub.subcategory_id,
                    }}
                    profiles={profileOptions}
                    accounts={accountOptions}
                    creditCards={creditCardOptions}
                    categories={categoryOptions}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
