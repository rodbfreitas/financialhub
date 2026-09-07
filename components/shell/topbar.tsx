import { ProfileSelector } from "@/components/shell/profile-selector";
import { PeriodSelector } from "@/components/shell/period-selector";
import { UserMenu } from "@/components/shell/user-menu";

/**
 * Topbar (desktop) — Design System §3: contexto permanente de período + perfil,
 * visível em toda navegação dentro do app. O UserMenu identifica quem está logado
 * e dá acesso a Configurações da conta e Sair sem depender só do rodapé da sidebar.
 */
export function TopBar({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="hidden h-16 shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-6 md:flex">
      <PeriodSelector />
      <ProfileSelector />
      <UserMenu userName={userName} userEmail={userEmail} />
    </header>
  );
}
