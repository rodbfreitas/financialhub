"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import type { MonthBucket } from "@/lib/dashboard";

function shortMoney(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-md border border-border bg-popover p-2.5 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      <p className={value >= 0 ? "text-positive" : "text-negative"}>Saldo: {formatMoney(value)}</p>
    </div>
  );
}

/** Evolução do saldo — últimos meses (PRD §9). */
export function BalanceTrendChart({ data }: { data: MonthBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={shortMoney} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-1)", strokeWidth: 1 }} />
        <Area type="monotone" dataKey="balance" stroke="var(--chart-1)" strokeWidth={2} fill="url(#balanceFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
