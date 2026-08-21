import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * A maioria das Server Actions do Financial Core precisa do household ativo do
 * usuário logado — centralizado aqui em vez de repetir a mesma query em cada action.
 * Retorna null se não houver usuário autenticado ou membership ativa (a action que
 * chamar isso decide a mensagem de erro apropriada).
 */
export async function getActiveHouseholdId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return data?.household_id ?? null;
}
