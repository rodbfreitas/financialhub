import { ProfileSelector } from "@/components/shell/profile-selector";
import { PeriodSelector } from "@/components/shell/period-selector";

/**
 * Topbar (desktop) — Design System §3: contexto permanente de período + perfil,
 * visível em toda navegação dentro do app.
 */
export function TopBar() {
  return (
    <header className="hidden h-16 shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-6 md:flex">
      <PeriodSelector />
      <ProfileSelector />
    </header>
  );
}
