import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/finance/money-display";
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";
import { DeleteBudgetButton } from "@/components/budgets/delete-budget-button";
import {
  budgetStatus,
  BUDGET_STATUS_LABELS,
  BUDGET_STATUS_BADGE_VARIANT,
  BUDGET_STATUS_BAR_CLASS,
} from "@/lib/budget-status";
import { budgetPeriodTypeOptions } from "@/lib/validations/budget";

type ProfileOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };
type BudgetItemView = {
  categoryId: string;
  categoryName: string;
  subcategoryName: string | null;
  planned: number;
  realized: number;
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Card de um orçamento (Etapa 8, PRD §19) — planejado x realizado x disponível por categoria. */
export function BudgetCard({
  budget,
  items,
  profiles,
  categories,
}: {
  budget: {
    id: string;
    name: string;
    periodType: (typeof budgetPeriodTypeOptions)[number];
    startDate: string;
    endDate: string;
    totalLimit: number | null;
    profileId: string | null;
    profileName: string | null;
  };
  items: BudgetItemView[];
  profiles: ProfileOption[];
  categories: CategoryOption[];
}) {
  const totalPlanned = items.reduce((sum, i) => sum + i.planned, 0);
  const totalRealized = items.reduce((sum, i) => sum + i.realized, 0);
  const envelope = budget.totalLimit ?? totalPlanned;
  const overallStatus = budgetStatus(envelope, totalRealized);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{budget.name}</h3>
            <Badge variant={BUDGET_STATUS_BADGE_VARIANT[overallStatus]}>
              {BUDGET_STATUS_LABELS[overallStatus]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(budget.startDate)} – {formatDate(budget.endDate)} ·{" "}
            {budget.profileName ?? "Familiar (todos)"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BudgetFormDialog
            budget={{
              id: budget.id,
              name: budget.name,
              periodType: budget.periodType,
              startDate: budget.startDate,
              endDate: budget.endDate,
              totalLimit: budget.totalLimit,
              profileId: budget.profileId,
              items: items.map((i) => ({
                categoryId: i.categoryId,
                subcategoryId: null,
                plannedAmount: i.planned,
              })),
            }}
            profiles={profiles}
            categories={categories}
          />
          <DeleteBudgetButton id={budget.id} name={budget.name} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="tabular-nums">
            <MoneyDisplay amount={totalRealized} /> de <MoneyDisplay amount={envelope} /> · disponível{" "}
            <MoneyDisplay amount={envelope - totalRealized} />
          </span>
        </div>
        <Progress
          value={Math.min(100, envelope > 0 ? (totalRealized / envelope) * 100 : 0)}
          indicatorClassName={BUDGET_STATUS_BAR_CLASS[overallStatus]}
        />

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {items.map((item) => {
            const status = budgetStatus(item.planned, item.realized);
            const pct = item.planned > 0 ? (item.realized / item.planned) * 100 : 0;
            return (
              <div key={item.categoryId + (item.subcategoryName ?? "")} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {item.categoryName}
                    {item.subcategoryName ? ` · ${item.subcategoryName}` : ""}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                    <MoneyDisplay
                      amount={item.realized}
                      className={status === "excedido" ? "font-medium text-negative" : "text-foreground"}
                    />
                    <span>de</span>
                    <MoneyDisplay amount={item.planned} />
                  </span>
                </div>
                <Progress value={Math.min(100, pct)} indicatorClassName={BUDGET_STATUS_BAR_CLASS[status]} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
