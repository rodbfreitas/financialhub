import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COOKIE, PERIOD_COOKIE, parsePeriodCookie, parseProfileCookie } from "@/lib/filters";
import { FiltersProvider } from "@/components/shell/filters-context";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopBar } from "@/components/shell/topbar";
import { MobileHeader } from "@/components/shell/mobile-header";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";

/**
 * Shell da aplicação autenticada (Etapa 5) — sidebar/topbar desktop, header/bottom nav
 * mobile, e o provider do filtro global de perfil+período (Design System §3-6). Toda
 * rota dentro do grupo (app) herda isso automaticamente; /login, /signup, /onboarding
 * e /auth/* ficam de fora (usam AuthShell, não esta casca).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, household:households(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, name, type")
    .eq("household_id", membership.household_id)
    .eq("active", true)
    .is("deleted_at", null)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  const cookieStore = await cookies();
  const initialProfileId = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);
  const initialPeriod = parsePeriodCookie(cookieStore.get(PERIOD_COOKIE)?.value);

  const userName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split("@")[0] || "Você";

  return (
    <FiltersProvider
      profiles={profilesData ?? []}
      initialProfileId={initialProfileId}
      initialPeriod={initialPeriod}
    >
      <div className="flex min-h-screen flex-1">
        <AppSidebar
          userName={userName}
          userEmail={user.email ?? ""}
          householdName={membership.household?.name ?? ""}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <MobileHeader />
          <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </FiltersProvider>
  );
}
