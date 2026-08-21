import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { ProfileFormDialog } from "@/components/profiles/profile-form-dialog";
import { ProfileActiveToggle } from "@/components/profiles/profile-active-toggle";

export const metadata: Metadata = { title: "Perfis — Financial Hub Familiar" };

export default async function PerfisPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, type, active")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Configurações
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Perfis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Perfis financeiros individuais e o compartilhado da família.
            </p>
          </div>
          <ProfileFormDialog />
        </div>
      </div>

      {profiles && profiles.length > 0 ? (
        <div
          className="max-w-lg divide-y divide-border rounded-lg border border-border bg-card"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <User className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{profile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.type === "shared" ? "Compartilhado" : "Individual"}
                </p>
              </div>
              <ProfileFormDialog
                profile={{ id: profile.id, name: profile.name, type: profile.type }}
              />
              <ProfileActiveToggle id={profile.id} active={profile.active} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex max-w-lg flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <User className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhum perfil cadastrado</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Crie um perfil para cada pessoa da família, mais um compartilhado para
            despesas em conjunto.
          </p>
          <ProfileFormDialog />
        </div>
      )}
    </div>
  );
}
