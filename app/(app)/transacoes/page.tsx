import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Receipt, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import {
  PROFILE_COOKIE,
  PERIOD_COOKIE,
  parsePeriodCookie,
  parseProfileCookie,
  periodToDateRange,
  formatPeriodLabel,
} from "@/lib/filters";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog";
import { DeleteTransferButton } from "@/components/transactions/delete-transfer-button";
import { InstallmentFormDialog } from "@/components/transactions/installment-form-dialog";
import { SplitDialog } from "@/components/transactions/split-dialog";
import { RecurringFormDialog } from "@/components/recurring/recurring-form-dialog";
import { GenerateRecurringButton } from "@/components/recurring/generate-recurring-button";
import { EntityActiveToggle } from "@/components/shared/entity-active-toggle";
import { setRecurringActive } from "@/actions/recurring";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Transações — Financial Hub Familiar" };

const STATUS_LABELS: Record<string, string> = {
  posted: "Efetivada",
  pending: "Pendente",
  planned: "Planejada",
  cancelled: "Cancelada",
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; accountId?: string }>;
}) {
  const { q, categoryId, accountId } = await searchParams;

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const profileFilter = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);
  const period = parsePeriodCookie(cookieStore.get(PERIOD_COOKIE)?.value);
  const { from, to } = periodToDateRange(period);

  let query = supabase
    .from("transactions")
    .select(
      "id, type, description, merchant, amount, transaction_date, status, nature, profile_id, account_id, credit_card_id, category_id, subcategory_id, notes, transfer_id, installment_plan_id, installment_number, profiles(name), accounts(name), credit_cards(name), categories(name), subcategories(name)",
    )
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (profileFilter !== "all") query = query.eq("profile_id", profileFilter);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (accountId) query = query.eq("account_id", accountId);
  if (q && q.trim()) query = query.ilike("description", `%${q.trim()}%`);

  const [{ data: transactions }, { data: profiles }, { data: accounts }, { data: creditCards }, { data: categories }] =
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
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  const profileOptions = profiles ?? [];
  const accountOptions = accounts ?? [];
  const creditCardOptions = creditCards ?? [];
  const categoryOptions = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));
  const hasTransactions = !!transactions && transactions.length > 0;

  type SplitRow = {
    id: string;
    transaction_id: string;
    profile_id: string | null;
    category_id: string;
    subcategory_id: string | null;
    amount: number;
  };

  let splitRows: SplitRow[] = [];
  if (hasTransactions) {
    const { data } = await supabase
      .from("transaction_splits")
      .select("id, transaction_id, profile_id, category_id, subcategory_id, amount")
      .in(
        "transaction_id",
        transactions.map((t) => t.id),
      );
    splitRows = data ?? [];
  }

  const splitsByTransaction = new Map<string, SplitRow[]>();
  for (const s of splitRows) {
    const list = splitsByTransaction.get(s.transaction_id) ?? [];
    list.push(s);
    splitsByTransaction.set(s.transaction_id, list);
  }

  const { data: recurringList } = await supabase
    .from("recurring_transactions")
    .select(
      "id, type, description, amount, frequency, interval, start_date, end_date, next_occurrence, active, profile_id, account_id, credit_card_id, category_id, subcategory_id, profiles(name), accounts(name), credit_cards(name)",
    )
    .eq("household_id", householdId)
    .order("active", { ascending: false })
    .order("next_occurrence", { ascending: true });

  const recurringOptions = recurringList ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Transações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPeriodLabel(period)} · núcleo operacional do sistema (PRD §10).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InstallmentFormDialog
            profiles={profileOptions}
            creditCards={creditCardOptions}
            categories={categoryOptions}
          />
          <TransferFormDialog profiles={profileOptions} accounts={accountOptions} />
          <TransactionFormDialog
            profiles={profileOptions}
            accounts={accountOptions}
            creditCards={creditCardOptions}
            categories={categoryOptions}
          />
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2" method="get">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar transação…"
            className="pl-9"
          />
        </div>
        <select
          name="categoryId"
          defaultValue={categoryId ?? "all"}
          className="h-9 w-[180px] rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <option value="all">Todas as categorias</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="accountId"
          defaultValue={accountId ?? "all"}
          className="h-9 w-[180px] rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <option value="all">Todas as contas</option>
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      {hasTransactions ? (
        <div
          className="overflow-x-auto rounded-lg border border-border bg-card"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 font-medium">Perfil</th>
                <th className="px-4 py-2.5 font-medium">Conta/Cartão</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{t.description}</p>
                    {t.merchant ? <p className="text-xs text-muted-foreground">{t.merchant}</p> : null}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.status !== "posted" ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {STATUS_LABELS[t.status] ?? t.status}
                        </Badge>
                      ) : null}
                      {t.type === "transfer" ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Transferência
                        </Badge>
                      ) : null}
                      {t.installment_plan_id ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Parcela {t.installment_number}
                        </Badge>
                      ) : null}
                      {(splitsByTransaction.get(t.id)?.length ?? 0) > 0 ? (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Dividida
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {t.categories?.name ?? "—"}
                    {t.subcategories?.name ? ` · ${t.subcategories.name}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.profiles?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {t.accounts?.name ?? t.credit_cards?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay
                      amount={t.type === "expense" ? -Number(t.amount) : Number(t.amount)}
                      signed
                      className="font-medium"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {t.type === "transfer" ? (
                        <DeleteTransferButton transferId={t.transfer_id as string} />
                      ) : (
                        <>
                          <SplitDialog
                            transactionId={t.id}
                            transactionAmount={Number(t.amount)}
                            hasSplits={(splitsByTransaction.get(t.id)?.length ?? 0) > 0}
                            existingSplits={(splitsByTransaction.get(t.id) ?? []).map((s) => ({
                              id: s.id,
                              profileId: s.profile_id,
                              categoryId: s.category_id,
                              subcategoryId: s.subcategory_id,
                              amount: Number(s.amount),
                            }))}
                            profiles={profileOptions}
                            categories={categoryOptions}
                          />
                          <TransactionFormDialog
                            transaction={{
                              id: t.id,
                              type: t.type as "income" | "expense" | "adjustment",
                              description: t.description,
                              merchant: t.merchant,
                              amount: Number(t.amount),
                              transactionDate: t.transaction_date,
                              status: t.status as "posted" | "pending" | "planned" | "cancelled",
                              nature: t.nature as "individual" | "shared",
                              profileId: t.profile_id,
                              paymentMethod: t.credit_card_id ? "credit_card" : t.account_id ? "account" : "none",
                              accountId: t.account_id,
                              creditCardId: t.credit_card_id,
                              categoryId: t.category_id,
                              subcategoryId: t.subcategory_id,
                              notes: t.notes,
                            }}
                            profiles={profileOptions}
                            accounts={accountOptions}
                            creditCards={creditCardOptions}
                            categories={categoryOptions}
                          />
                          <DeleteTransactionButton id={t.id} description={t.description} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="flex max-w-lg flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Receipt className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhuma transação no período</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Ajuste os filtros ou registre a primeira transação de {formatPeriodLabel(period).toLowerCase()}.
          </p>
          <TransactionFormDialog
            profiles={profileOptions}
            accounts={accountOptions}
            creditCards={creditCardOptions}
            categories={categoryOptions}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recorrências</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lançamentos que se repetem — gere a próxima ocorrência manualmente quando quiser.
            </p>
          </div>
          <RecurringFormDialog
            profiles={profileOptions}
            accounts={accountOptions}
            creditCards={creditCardOptions}
            categories={categoryOptions}
          />
        </div>

        {recurringOptions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recurringOptions.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[r.frequency] ?? r.frequency}
                      {r.interval > 1 ? ` (a cada ${r.interval})` : ""} · {r.profiles?.name ?? "—"}
                    </p>
                  </div>
                  <EntityActiveToggle id={r.id} active={r.active} action={setRecurringActive} />
                </div>

                <MoneyDisplay
                  amount={r.type === "expense" ? -Number(r.amount) : Number(r.amount)}
                  signed
                  className="text-sm font-medium"
                />

                <p className="text-xs text-muted-foreground">
                  {r.account_id || r.credit_card_id ? (r.accounts?.name ?? r.credit_cards?.name) : "Sem forma de pagamento"}
                </p>

                <p className="text-xs text-muted-foreground">
                  Próxima ocorrência: {new Date(r.next_occurrence + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <GenerateRecurringButton id={r.id} />
                  <RecurringFormDialog
                    recurring={{
                      id: r.id,
                      type: r.type as "income" | "expense",
                      description: r.description,
                      amount: Number(r.amount),
                      frequency: r.frequency,
                      interval: r.interval,
                      startDate: r.start_date,
                      endDate: r.end_date,
                      profileId: r.profile_id,
                      paymentMethod: r.credit_card_id ? "credit_card" : r.account_id ? "account" : "none",
                      accountId: r.account_id,
                      creditCardId: r.credit_card_id,
                      categoryId: r.category_id,
                      subcategoryId: r.subcategory_id,
                    }}
                    profiles={profileOptions}
                    accounts={accountOptions}
                    creditCards={creditCardOptions}
                    categories={categoryOptions}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma recorrência cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
