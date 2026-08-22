"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

export type NetWorthPoint = {
  date: string;
  label: string;
  totalAccounts: number;
  totalAssets: number;
  totalCreditCardDebt: number;
  totalLiabilities: number;
  netWorth: number;
};

function shortMoney(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: NetWorthPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover p-2.5 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      <p className={p.netWorth >= 0 ? "text-positive" : "text-negative"}>Patrimônio líquido: {formatMoney(p.netWorth)}</p>
      <p className="mt-1 text-muted-foreground">Ativos: {formatMoney(p.totalAccounts + p.totalAssets)}</p>
      <p className="text-muted-foreground">Passivos: {formatMoney(p.totalCreditCardDebt + p.totalLiabilities)}</p>
    </div>
  );
}

/**
 * Evolução do patrimônio líquido a partir dos snapshots reais (021_net_worth_snapshots.sql).
 * Cresce com o uso do app — sem dados retroativos inventados (ver comentário da
 * migration pra entender por que não reconstruímos histórico que nunca existiu).
 */
export function NetWorthTrendChart({ data }: { data: NetWorthPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ainda não há histórico suficiente. O gráfico aparece conforme você usa o Financial Hub — cada
        visita à página de Patrimônio registra um ponto do dia.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={shortMoney} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-1)", strokeWidth: 1 }} />
        <Area type="monotone" dataKey="netWorth" stroke="var(--chart-1)" strokeWidth={2} fill="url(#netWorthFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
