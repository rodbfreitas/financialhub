"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import type { DailyCashFlowPoint } from "@/lib/reports";

function shortMoney(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyCashFlowPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover p-2.5 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      <p className={point.net >= 0 ? "text-positive" : "text-negative"}>Dia: {formatMoney(point.net)}</p>
      <p className={point.cumulative >= 0 ? "text-positive" : "text-negative"}>
        Acumulado: {formatMoney(point.cumulative)}
      </p>
    </div>
  );
}

/** Fluxo de caixa diário dentro do período — saldo acumulado (PRD §32). */
export function DailyCashFlowChart({ data }: { data: DailyCashFlowPoint[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dailyCashFlowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={shortMoney} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-1)", strokeWidth: 1 }} />
        <Area type="monotone" dataKey="cumulative" stroke="var(--chart-1)" strokeWidth={2} fill="url(#dailyCashFlowFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
