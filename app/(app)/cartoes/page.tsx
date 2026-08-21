import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard as CreditCardIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { CreditCardFormDialog } from "@/components/credit-cards/credit-card-form-dialog";
import { EntityActiveToggle } from "@/components/shared/entity-active-toggle";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Badge } from "@/components/ui/badge";
import { setCreditCardActive } from "@/actions/credit-cards";
import { cardBrandOptions } from "@/lib/validations/credit-card";

export const metadata: Metadata = { title: "Cartões — Financial Hub Familiar" };

const BRAND_LABELS: Record<(typeof cardBrandOptions)[number], string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  other: "Outra",
};

const BILL_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
  overdue: "Vencida",
};

function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function CartoesPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const [{ data: cards }, { data: profiles }, { data: bills }] = await Promise.all([
    supabase
      .from("credit_cards")
      .select(
        "id, name, institution_name, brand, last_four_digits, credit_limit, closing_day, due_day, active, profile_id, profiles(name)",
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
    supabase
      .from("credit_card_bills")
      .select("credit_card_id, reference_month, closing_date, due_date, total_amount, status")
      .eq("household_id", householdId)
      .eq("reference_month", currentMonthStart()),
  ]);

  const profileOptions = profiles ?? [];
  const hasCards = !!cards && cards.length > 0;
  const billByCard = new Map((bills ?? []).map((b) => [b.credit_card_id, b]));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cartões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cartões de crédito e o resumo da fatura do mês atual.
          </p>
        </div>
        <CreditCardFormDialog profiles={profileOptions} />
      </div>

      {hasCards ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const bill = billByCard.get(card.id);
            return (
              <div
                key={card.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <CreditCardIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{card.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {BRAND_LABELS[card.brand as (typeof cardBrandOptions)[number]] ?? card.brand}{" "}
                        •••• {card.last_four_digits ?? "----"} · {card.profiles?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <EntityActiveToggle
                    id={card.id}
                    active={card.active}
                    action={setCreditCardActive}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Limite</span>
                  <MoneyDisplay amount={Number(card.credit_limit)} className="font-medium text-foreground" />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Fecha dia {card.closing_day}</span>
                  <span>Vence dia {card.due_day}</span>
                </div>

                <div className="rounded-md border border-dashed border-border p-3">
                  <p className="text-xs text-muted-foreground">Fatura atual</p>
                  {bill ? (
                    <div className="mt-1 flex items-center justify-between">
                      <MoneyDisplay amount={Number(bill.total_amount)} className="text-sm font-medium text-foreground" />
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {BILL_STATUS_LABELS[bill.status] ?? bill.status}
                      </Badge>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nenhuma fatura ainda — será gerada a partir das transações lançadas no cartão.
                    </p>
                  )}
                </div>

                <CreditCardFormDialog
                  card={{
                    id: card.id,
                    name: card.name,
                    institutionName: card.institution_name,
                    brand: card.brand as (typeof cardBrandOptions)[number],
                    lastFourDigits: card.last_four_digits ?? "",
                    creditLimit: Number(card.credit_limit),
                    closingDay: card.closing_day,
                    dueDay: card.due_day,
                    profileId: card.profile_id,
                  }}
                  profiles={profileOptions}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="flex max-w-lg flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <CreditCardIcon className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhum cartão cadastrado</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Cadastre seus cartões de crédito para acompanhar limite e faturas.
          </p>
          <CreditCardFormDialog profiles={profileOptions} />
        </div>
      )}
    </div>
  );
}
