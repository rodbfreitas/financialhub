"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/money";
import { MoneyDisplay } from "@/components/finance/money-display";
import type { CategorySlice } from "@/lib/dashboard";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover p-2.5 text-xs shadow-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p>{formatMoney(payload[0].value)}</p>
    </div>
  );
}

/** Gastos por categoria — distribuição (PRD §9). */
export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma despesa lançada neste período.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="mx-auto sm:mx-0">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
              {data.map((entry, index) => (
                <Cell key={entry.categoryId ?? entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((slice, index) => (
          <li key={slice.categoryId ?? slice.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 truncate">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 tabular-nums text-muted-foreground">
              <MoneyDisplay amount={slice.amount} className="text-foreground" />
              <span className="w-10 text-right">{slice.percentage.toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
