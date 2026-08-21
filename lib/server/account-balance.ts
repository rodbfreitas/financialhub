import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Aplica um delta no saldo de uma conta (migration 018 — ver comentário lá para a convenção). */
export async function applyAccountDelta(
  supabase: SupabaseClient<Database>,
  accountId: string,
  delta: number,
): Promise<void> {
  await supabase.rpc("adjust_account_balance", { p_account_id: accountId, p_delta: delta });
}
