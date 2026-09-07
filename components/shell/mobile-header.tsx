import Link from "next/link";
import { ProfileSelector } from "@/components/shell/profile-selector";
import { PeriodSelector } from "@/components/shell/period-selector";
import { UserMenu } from "@/components/shell/user-menu";

/**
 * Header mobile — Design System §47: marca no topo, período + perfil logo abaixo
 * (mobile não é só o desktop comprimido, então isto é um componente separado do
 * TopBar, não o mesmo elemento escondido/mostrado por CSS). O UserMenu garante que
 * dá pra identificar quem está logado e sair também no mobile, sem depender só do
 * atalho "Mais" do bottom nav.
 */
export function MobileHeader({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-foreground">
          Financial Hub
        </Link>
        <UserMenu userName={userName} userEmail={userEmail} />
      </div>
      <div className="flex items-center gap-2">
        <PeriodSelector />
        <ProfileSelector />
      </div>
    </header>
  );
}
