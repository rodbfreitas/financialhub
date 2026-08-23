import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Testes de RLS (Row Level Security) — Etapa 12 (QA), Prompt Mestre "RLS tests".
 *
 * Estes testes rodam contra o projeto Supabase REAL (não há projeto de teste
 * separado) usando `SUPABASE_SERVICE_ROLE_KEY` para:
 *   1. Criar dois households sintéticos ("A" e "B"), cada um com um usuário de auth
 *      próprio, um perfil e uma conta.
 *   2. Autenticar como o usuário de cada household usando a ANON key (exatamente
 *      como o app faz em produção) — é essa sessão, não a service role, que sofre
 *      as policies de RLS.
 *   3. Provar que o usuário do household A NUNCA enxerga (select) nem consegue
 *      escrever (insert) dados do household B, e vice-versa.
 *   4. Limpar tudo ao final (households, membros, perfis, contas, usuários de auth),
 *      mesmo se algum teste falhar no meio do caminho.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` nunca é commitada — os testes se pulam sozinhos
 * (`describe.skipIf`) quando a env var não está setada, então `npm test` (que usa
 * vitest.config.ts, sem este arquivo) e qualquer CI sem a secret nunca falham por
 * causa disso. Para rodar de verdade:
 *   SUPABASE_SERVICE_ROLE_KEY="..." NEXT_PUBLIC_SUPABASE_URL="..." \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY="..." npm run test:rls
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasCreds = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

type Household = {
  householdId: string;
  userId: string;
  email: string;
  profileId: string;
  accountId: string;
  userClient: SupabaseClient<Database>;
};

describe.skipIf(!hasCreds)("RLS: isolamento entre households", () => {
  let admin: SupabaseClient<Database>;
  let a: Household;
  let b: Household;
  const password = `Test-${Math.random().toString(36).slice(2)}-Aa1!`;

  async function provisionHousehold(label: string): Promise<Household> {
    const email = `rls-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userErr || !userRes.user) throw new Error(`Falha ao criar usuário de teste (${label}): ${userErr?.message}`);
    const userId = userRes.user.id;

    const { data: household, error: householdErr } = await admin
      .from("households")
      .insert({ name: `RLS Test Household ${label}` })
      .select("id")
      .single();
    if (householdErr || !household) throw new Error(`Falha ao criar household (${label}): ${householdErr?.message}`);

    const { error: memberErr } = await admin
      .from("household_members")
      .insert({ household_id: household.id, user_id: userId, role: "owner", status: "active" });
    if (memberErr) throw new Error(`Falha ao criar membership (${label}): ${memberErr.message}`);

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .insert({ household_id: household.id, name: `Titular ${label}`, type: "individual", linked_user_id: userId })
      .select("id")
      .single();
    if (profileErr || !profile) throw new Error(`Falha ao criar perfil (${label}): ${profileErr?.message}`);

    const { data: account, error: accountErr } = await admin
      .from("accounts")
      .insert({ household_id: household.id, profile_id: profile.id, name: `Conta ${label}`, type: "checking" })
      .select("id")
      .single();
    if (accountErr || !account) throw new Error(`Falha ao criar conta (${label}): ${accountErr?.message}`);

    const userClient = createSupabaseClient<Database>(SUPABASE_URL!, ANON_KEY!);
    const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`Falha ao autenticar usuário de teste (${label}): ${signInErr.message}`);

    return { householdId: household.id, userId, email, profileId: profile.id, accountId: account.id, userClient };
  }

  async function teardownHousehold(h: Household | undefined) {
    if (!h) return;
    await admin.from("accounts").delete().eq("household_id", h.householdId);
    await admin.from("profiles").delete().eq("household_id", h.householdId);
    await admin.from("household_members").delete().eq("household_id", h.householdId);
    await admin.from("households").delete().eq("id", h.householdId);
    await admin.auth.admin.deleteUser(h.userId);
  }

  beforeAll(async () => {
    admin = createSupabaseClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    a = await provisionHousehold("A");
    b = await provisionHousehold("B");
  }, 30_000);

  afterAll(async () => {
    // Limpeza sempre roda, mesmo se algum `it` falhar — nunca deixamos household
    // sintético de teste órfão no projeto real.
    await teardownHousehold(a);
    await teardownHousehold(b);
  }, 30_000);

  it("usuário A enxerga o próprio household mas não o household B (select em households)", async () => {
    const { data, error } = await a.userClient.from("households").select("id").eq("id", b.householdId);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: own } = await a.userClient.from("households").select("id").eq("id", a.householdId);
    expect(own).toEqual([{ id: a.householdId }]);
  });

  it("usuário A não enxerga a conta do household B (select em accounts)", async () => {
    const { data, error } = await a.userClient.from("accounts").select("id").eq("id", b.accountId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuário B não enxerga a conta do household A (isolamento é nos dois sentidos)", async () => {
    const { data, error } = await b.userClient.from("accounts").select("id").eq("id", a.accountId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuário A não consegue inserir uma transação no household B (insert bloqueado pela policy with check)", async () => {
    const { error } = await a.userClient.from("transactions").insert({
      household_id: b.householdId,
      profile_id: b.profileId,
      account_id: b.accountId,
      type: "expense",
      description: "Transação maliciosa de teste RLS",
      amount: 10,
      transaction_date: "2026-01-01",
      nature: "individual",
      source: "manual",
    });
    expect(error).not.toBeNull();

    // Confirma que nada vazou: nenhuma transação com essa descrição existe (nem
    // sequer visível pro admin, que ignora RLS — se o insert tivesse sido bloqueado
    // só pelo client e não pelo banco, isso pegaria o caso).
    const { data: leaked } = await admin
      .from("transactions")
      .select("id")
      .eq("household_id", b.householdId)
      .eq("description", "Transação maliciosa de teste RLS");
    expect(leaked).toEqual([]);
  });

  it("usuário A consegue inserir uma transação no PRÓPRIO household (RLS não está bloqueando tudo)", async () => {
    const { data, error } = await a.userClient
      .from("transactions")
      .insert({
        household_id: a.householdId,
        profile_id: a.profileId,
        account_id: a.accountId,
        type: "expense",
        description: "Transação legítima de teste RLS",
        amount: 10,
        transaction_date: "2026-01-01",
        nature: "individual",
        source: "manual",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    // Limpa a transação criada por este teste (não faz parte do teardown genérico).
    if (data?.id) await admin.from("transactions").delete().eq("id", data.id);
  });

  it("usuário A não consegue atualizar o nome do household B (update bloqueado)", async () => {
    const { error, data } = await a.userClient
      .from("households")
      .update({ name: "Hackeado" })
      .eq("id", b.householdId)
      .select("id");
    // RLS filtra a linha antes do update (nenhuma linha afetada); pode vir como
    // array vazio sem erro explícito, dependendo da policy — o que importa é que o
    // nome real não mudou.
    expect(data ?? []).toEqual([]);
    void error;

    const { data: current } = await admin.from("households").select("name").eq("id", b.householdId).single();
    expect(current?.name).toBe("RLS Test Household B");
  });

  describe("RLS: tabelas de Financial Document Intelligence (Fase 2 / migration 022)", () => {
    // Cadeia mínima real (não mockada) no household B: financial_documents →
    // document_processing_runs → extracted_financial_events → interpreted_financial_events.
    // Cascateia sozinha a partir do `households` delete no afterAll externo (todas as
    // FKs até households são ON DELETE CASCADE), então não precisa de teardown próprio.
    let documentId: string;
    let interpretedEventId: string;

    beforeAll(async () => {
      const sha256 = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const { data: doc, error: docErr } = await admin
        .from("financial_documents")
        .insert({
          household_id: b.householdId,
          uploaded_by: b.userId,
          storage_bucket: "financial-documents",
          storage_path: `${b.householdId}/documents/rls-test/fatura.pdf`,
          original_filename: "fatura.pdf",
          mime_type: "application/pdf",
          file_size_bytes: 1024,
          sha256,
          status: "received",
        })
        .select("id")
        .single();
      if (docErr || !doc) throw new Error(`Falha ao criar financial_documents (RLS setup): ${docErr?.message}`);
      documentId = doc.id;

      const { data: run, error: runErr } = await admin
        .from("document_processing_runs")
        .insert({ document_id: documentId, household_id: b.householdId, status: "succeeded" })
        .select("id")
        .single();
      if (runErr || !run) throw new Error(`Falha ao criar document_processing_runs (RLS setup): ${runErr?.message}`);

      const { data: extracted, error: extractedErr } = await admin
        .from("extracted_financial_events")
        .insert({
          run_id: run.id,
          document_id: documentId,
          household_id: b.householdId,
          source_event_index: 0,
          raw_description: "Compra teste RLS",
          raw_amount: "10,00",
          parsed_amount: 10,
        })
        .select("id")
        .single();
      if (extractedErr || !extracted) {
        throw new Error(`Falha ao criar extracted_financial_events (RLS setup): ${extractedErr?.message}`);
      }

      const { data: interpreted, error: interpretedErr } = await admin
        .from("interpreted_financial_events")
        .insert({ extracted_event_id: extracted.id, event_type: "purchase", amount: 10 })
        .select("id")
        .single();
      if (interpretedErr || !interpreted) {
        throw new Error(`Falha ao criar interpreted_financial_events (RLS setup): ${interpretedErr?.message}`);
      }
      interpretedEventId = interpreted.id;
    }, 30_000);

    it("usuário A não enxerga financial_documents do household B (tabela com household_id direto)", async () => {
      const { data, error } = await a.userClient.from("financial_documents").select("id").eq("id", documentId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("usuário B enxerga o próprio financial_documents", async () => {
      const { data, error } = await b.userClient.from("financial_documents").select("id").eq("id", documentId);
      expect(error).toBeNull();
      expect(data).toEqual([{ id: documentId }]);
    });

    it("usuário A não consegue inserir financial_documents no household B (insert bloqueado)", async () => {
      const { error } = await a.userClient.from("financial_documents").insert({
        household_id: b.householdId,
        storage_bucket: "financial-documents",
        storage_path: `${b.householdId}/documents/malicious/x.pdf`,
        original_filename: "malicioso.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 1,
        sha256: `malicious-${Date.now()}`,
      });
      expect(error).not.toBeNull();
    });

    it("usuário A não enxerga interpreted_financial_events do household B (isolamento via subquery de 2 saltos)", async () => {
      const { data, error } = await a.userClient
        .from("interpreted_financial_events")
        .select("id")
        .eq("id", interpretedEventId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("usuário B enxerga o próprio interpreted_financial_events", async () => {
      const { data, error } = await b.userClient
        .from("interpreted_financial_events")
        .select("id")
        .eq("id", interpretedEventId);
      expect(error).toBeNull();
      expect(data).toEqual([{ id: interpretedEventId }]);
    });
  });
});
