"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createHouseholdSchema } from "@/lib/validations/household";
import type { AuthActionState } from "@/actions/auth";

type FinalizeResult =
  | { status: "already_member" }
  | { status: "created"; householdId: string }
  | { status: "joined"; householdId: string }
  | { status: "needs_setup" }
  | { status: "error"; message: string };

/**
 * Chamado por /onboarding logo após o login (inclusive vindo do link de confirmação
 * de e-mail). Se o usuário já pertence a algum household, não faz nada. Caso
 * contrário, finaliza a intenção guardada em user_metadata no momento do signup:
 * criar um household novo (owner) ou aceitar um convite pendente.
 *
 * Fica em Server Action separada de actions/auth.ts porque não é "autenticação" —
 * é o primeiro passo de authorization/household setup, reaproveitado tanto pelo
 * fluxo pós-signup quanto por um possível "esqueci de configurar" no futuro.
 */
export async function finalizeHouseholdSetup(): Promise<FinalizeResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "not_authenticated" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return { status: "error", message: membershipError.message };
  }

  if (membership) {
    return { status: "already_member" };
  }

  const pendingInviteToken = user.user_metadata?.pending_invite_token as string | undefined;
  const pendingHouseholdName = user.user_metadata?.pending_household_name as string | undefined;

  if (pendingInviteToken) {
    const { data: householdId, error } = await supabase.rpc("accept_household_invite", {
      p_token: pendingInviteToken,
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    await supabase.auth.updateUser({ data: { pending_invite_token: null } });
    return { status: "joined", householdId: householdId as string };
  }

  if (pendingHouseholdName) {
    // Id gerado no client e enviado explicitamente no insert (em vez de `.select().single()`
    // pra ler de volta via RETURNING) — bug real encontrado em produção nesta sessão: com
    // RETURNING, o Postgres também aplica a policy de SELECT (`is_household_member(id)`) à
    // linha retornada, e nesse exato instante o usuário AINDA não é membro (isso só é criado
    // no próximo insert, em household_members) — então a RLS rejeitava o INSERT inteiro com
    // "new row violates row-level security policy", mesmo a policy de INSERT (`auth.uid() is
    // not null`) sendo satisfeita. Sem RETURNING, só a policy de INSERT é avaliada.
    const householdId = randomUUID();
    const { error: householdError } = await supabase
      .from("households")
      .insert({ id: householdId, name: pendingHouseholdName });

    if (householdError) {
      return { status: "error", message: householdError.message };
    }

    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: householdId,
      user_id: user.id,
      role: "owner",
      status: "active",
    });

    if (memberError) {
      return { status: "error", message: memberError.message };
    }

    await supabase.auth.updateUser({ data: { pending_household_name: null } });
    return { status: "created", householdId };
  }

  // Sem metadata de intenção (ex.: conta antiga, ou fluxo interrompido) — a página de
  // onboarding decide o que mostrar (hoje, uma orientação simples em vez de mágica).
  return { status: "needs_setup" };
}

/**
 * Fallback usado só pela tela de /onboarding quando finalizeHouseholdSetup() devolve
 * "needs_setup" — a pessoa está autenticada, sem household, e sem intenção salva em
 * user_metadata (conta antiga ou fluxo de signup interrompido antes da confirmação).
 * Em vez de deixar a conta travada, deixa criar um household aqui mesmo, virando
 * owner — mesma regra de "quem cria sozinho vira dono" do signup normal.
 */
export async function createHouseholdAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = createHouseholdSchema.safeParse({
    householdName: formData.get("householdName"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sua sessão expirou. Entre novamente." };
  }

  const { data: existingMembership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    redirect("/dashboard");
  }

  // Id gerado no client (ver o mesmo comentário em finalizeHouseholdSetup, acima) — sem isso
  // o RETURNING implícito de `.select().single()` aciona a policy de SELECT
  // (`is_household_member`) antes do usuário virar membro, e a RLS rejeita o insert inteiro.
  const householdId = randomUUID();
  const { error: householdError } = await supabase
    .from("households")
    .insert({ id: householdId, name: parsed.data.householdName });

  if (householdError) {
    return { error: "Não foi possível criar seu household. Tente novamente." };
  }

  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: householdId,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    return { error: "Não foi possível concluir a configuração. Tente novamente." };
  }

  redirect("/dashboard");
}
