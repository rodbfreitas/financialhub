import { Progress } from "@/components/ui/progress";
import { MoneyDisplay } from "@/components/finance/money-display";
import { cn } from "@/lib/utils";

export type BudgetRow = { categoryId: string; categoryName: string; planned: number; realized: number };

/**
 * Orçamento x realizado, por categoria (PRD §9/§19). O CRUD de orçamentos (tabela
 * `budgets`/`budget_items`) é escopo da Etapa 8 — aqui só se consome o que já existir
 * na tabela real; sem orçamento cadastrado, o estado é honesto (nada inventado).
 */
export function BudgetProgressList({ data }: { data: BudgetRow[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum orçamento definido para este período ainda.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {data.map((row) => {
        const pct = row.planned > 0 ? (row.realized / row.planned) * 100 : 0;
        const over = row.planned > 0 && row.realized > row.planned;
        return (
          <li key={row.categoryId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{row.categoryName}</span>
              <span className="tabular-nums text-muted-foreground">
                <MoneyDisplay amount={row.realized} className={over ? "text-negative font-medium" : "text-foreground"} /> de{" "}
                <MoneyDisplay amount={row.planned} />
              </span>
            </div>
            <Progress
              value={Math.min(100, pct)}
              className={cn(over && "bg-negative/15")}
              indicatorClassName={over ? "bg-negative" : "bg-primary"}
            />
          </li>
        );
      })}
    </ul>
  );
}
