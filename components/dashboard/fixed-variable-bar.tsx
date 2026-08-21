import { MoneyDisplay } from "@/components/finance/money-display";
import type { FixedVariableSplit } from "@/lib/dashboard";

/**
 * Fixos x variáveis — comparação das despesas (PRD §9). "Fixo" aqui é derivado de dados
 * reais (despesas vindas de uma recorrência ou parcelamento — ver `lib/dashboard.ts`),
 * não um valor arbitrário.
 */
export function FixedVariableBar({ data }: { data: FixedVariableSplit }) {
  const total = data.fixed + data.variable;

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa lançada neste período.</p>;
  }

  const fixedPct = (data.fixed / total) * 100;
  const variablePct = 100 - fixedPct;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-[var(--chart-1)]" style={{ width: `${fixedPct}%` }} />
        <div className="h-full bg-[var(--chart-4)]" style={{ width: `${variablePct}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[var(--chart-1)]" />
          Fixas ({fixedPct.toFixed(0)}%)
        </span>
        <MoneyDisplay amount={data.fixed} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[var(--chart-4)]" />
          Variáveis ({variablePct.toFixed(0)}%)
        </span>
        <MoneyDisplay amount={data.variable} />
      </div>
      <p className="text-xs text-muted-foreground">
        Fixas: despesas geradas por recorrências ou parcelamentos. Variáveis: os demais lançamentos avulsos.
      </p>
    </div>
  );
}
