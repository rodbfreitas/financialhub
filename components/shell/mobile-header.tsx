import Link from "next/link";
import { ProfileSelector } from "@/components/shell/profile-selector";
import { PeriodSelector } from "@/components/shell/period-selector";

/**
 * Header mobile — Design System §47: marca no topo, período + perfil logo abaixo
 * (mobile não é só o desktop comprimido, então isto é um componente separado do
 * TopBar, não o mesmo elemento escondido/mostrado por CSS).
 */
export function MobileHeader() {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
      <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-foreground">
        Financial Hub
      </Link>
      <div className="flex items-center gap-2">
        <PeriodSelector />
        <ProfileSelector />
      </div>
    </header>
  );
}
