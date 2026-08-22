import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Deduplicação (Prompt Mestre §27): "Implementar estratégia combinada. Priorizar:
 * external_id; fingerprint/hash; conta/cartão; data; valor; merchant normalizado.
 * Nunca assumir que apenas descrição + valor são suficientes." O hash entra no
 * fingerprint (conta/cartão + data + valor + descrição normalizada); o `external_id`
 * (FITID do OFX) é checado à parte, com prioridade maior, antes do hash.
 */
export function normalizeMerchant(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function computeDedupHash(input: {
  accountId: string | null;
  creditCardId: string | null;
  date: string;
  amount: number;
  description: string;
}): string {
  const key = [
    input.accountId ?? "-",
    input.creditCardId ?? "-",
    input.date,
    Math.abs(input.amount).toFixed(2),
    normalizeMerchant(input.description),
  ].join("|");
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Procura uma transação real já existente que bata com external_id (prioridade) ou
 * com o hash de fingerprint, restrita ao household — usada tanto durante o parse
 * (pra marcar `import_rows.status = 'duplicate'`) quanto, defensivamente, na
 * confirmação (pra nunca duplicar mesmo se o usuário reabrir uma revisão antiga).
 */
export async function findDuplicateTransaction(
  supabase: SupabaseClient<Database>,
  householdId: string,
  candidate: { externalId?: string | null; dedupHash: string },
): Promise<string | null> {
  if (candidate.externalId) {
    const { data } = await supabase
      .from("transactions")
      .select("id")
      .eq("household_id", householdId)
      .eq("external_id", candidate.externalId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("household_id", householdId)
    .eq("deduplication_hash", candidate.dedupHash)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
