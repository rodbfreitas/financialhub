import { Repeat, CreditCard as CreditCardIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/finance/money-display";
import { GenerateRecurringButton } from "@/components/recurring/generate-recurring-button";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

const BILL_STATUS_VARIANT: Record<string, "info" | "warning" | "negative"> = {
  open: "info",
  closed: "warning",
  overdue: "negative",
};

const BILL_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  overdue: "Vencida",
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export type UpcomingRecurring = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  nextOccurrence: string;
  frequency: string;
  profileName: string;
};

export type UpcomingBill = {
  id: string;
  cardName: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  profileName: string;
};

/** Camada "FUTURO" do dashboard (Prompt Mestre §16) — compromissos já reais no banco. */
export function UpcomingCommitments({ recurring, bills }: { recurring: UpcomingRecurring[]; bills: UpcomingBill[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Repeat className="size-4" />
          Próximas recorrências
        </h3>
        {recurring.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma recorrência ativa.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recurring.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.nextOccurrence)} · {FREQUENCY_LABELS[r.frequency] ?? r.frequency} · {r.profileName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <MoneyDisplay amount={r.type === "income" ? r.amount : -r.amount} signed />
                  <GenerateRecurringButton id={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CreditCardIcon className="size-4" />
          Faturas de cartão em aberto
        </h3>
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fatura em aberto.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.cardName}</p>
                  <p className="text-xs text-muted-foreground">
                    Vence {formatDate(b.dueDate)} · {b.profileName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <MoneyDisplay amount={b.totalAmount} />
                  <Badge variant={BILL_STATUS_VARIANT[b.status] ?? "secondary"}>
                    {BILL_STATUS_LABELS[b.status] ?? b.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
