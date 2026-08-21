import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/finance/money-display";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { cn } from "@/lib/utils";

/** Cartão de KPI do topo do dashboard — Design System §63, prioridade #1 (saldo/fluxo). */
export function KpiCard({
  icon: Icon,
  label,
  value,
  previousValue,
  higherIsBetter,
  unit = "money",
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  previousValue?: number;
  higherIsBetter?: boolean;
  unit?: "money" | "percent";
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className={cn("text-2xl font-semibold tabular-nums", valueClassName)}>
          {unit === "percent" ? `${value.toFixed(1)}%` : <MoneyDisplay amount={value} />}
        </div>
        {previousValue !== undefined && higherIsBetter !== undefined ? (
          <TrendIndicator
            current={value}
            previous={previousValue}
            higherIsBetter={higherIsBetter}
            unit={unit === "percent" ? "points" : "money"}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
