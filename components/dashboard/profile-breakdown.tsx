import { MoneyDisplay } from "@/components/finance/money-display";
import { Badge } from "@/components/ui/badge";
import type { ProfileSlice } from "@/lib/dashboard";

/** Gastos por perfil — Rodrigo x Lenise x Compartilhado (PRD §9), com os perfis reais do household. */
export function ProfileBreakdown({ data }: { data: ProfileSlice[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação neste período.</p>;
  }

  const maxExpense = Math.max(...data.map((p) => p.expenses), 1);

  return (
    <ul className="flex flex-col gap-4">
      {data.map((profile) => (
        <li key={profile.profileId} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              {profile.name}
              {profile.type === "shared" ? (
                <Badge variant="secondary">Compartilhado</Badge>
              ) : null}
            </span>
            <span className="flex items-center gap-3 tabular-nums text-muted-foreground">
              <span className="text-positive">
                <MoneyDisplay amount={profile.income} className="text-positive" />
              </span>
              <span className="text-negative">
                <MoneyDisplay amount={profile.expenses} className="text-negative" />
              </span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[var(--chart-2)]"
              style={{ width: `${Math.max(4, (profile.expenses / maxExpense) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
