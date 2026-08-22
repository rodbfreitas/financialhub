import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integração (mock do Supabase): prova o bug real de sinal encontrado na Etapa 12 (QA)
 * e a correção aplicada.
 *
 * Contexto: `contributionFor(type, amount)` (lib/server/credit-card-bills.ts) devolve
 * a convenção de FATURA de cartão — despesa = +valor (aumenta o que se deve). A
 * convenção de CONTA (`adjust_account_balance`, migration 018) é o OPOSTO — positivo =
 * entrada, negativo = saída. Antes desta correção, `actions/transactions.ts`,
 * `actions/recurring.ts` e `actions/imports.ts` reaproveitavam o mesmo valor de
 * `contributionFor` para os dois RPCs sem inverter o sinal para conta — ou seja, uma
 * despesa paga em conta SOMAVA ao saldo em vez de subtrair. `actions/transfers.ts` já
 * usava a convenção correta e serviu de referência para o fix.
 *
 * Estes testes chamam as Server Actions de verdade (createTransaction/updateTransaction/
 * deleteTransaction), com um mock do cliente Supabase que apenas registra os argumentos
 * passados a `supabase.rpc(...)` — não uma simulação da lógica de negócio, e sim uma
 * captura do que realmente seria enviado ao Postgres.
 */

type RpcArgs = Record<string, unknown>;
type RpcCall = { name: string; args: RpcArgs };
type QueryResult = { data?: unknown; error: unknown };

/** Builder falso encadeável o suficiente para os métodos que as actions realmente usam. */
interface FakeQueryBuilder extends PromiseLike<QueryResult> {
  select: () => FakeQueryBuilder;
  insert: () => FakeQueryBuilder;
  update: () => FakeQueryBuilder;
  eq: () => FakeQueryBuilder;
  order: () => FakeQueryBuilder;
  limit: () => FakeQueryBuilder;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
}

const supabaseRef = vi.hoisted(() => ({ current: null as ReturnType<typeof makeSupabase> | null }));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabaseRef.current }));
vi.mock("@/lib/supabase/household", () => ({ getActiveHouseholdId: async () => "household-1" }));

const { createTransaction, updateTransaction, deleteTransaction } = await import("@/actions/transactions");

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const CARD_ID = "33333333-3333-4333-8333-333333333333";

function makeSupabase(opts: { transactionSelectResult?: QueryResult; cardResult?: QueryResult } = {}) {
  const rpcCalls: RpcCall[] = [];

  function makeBuilder(table: string): FakeQueryBuilder {
    let mode: "select" | "insert" | "update" = "select";
    function resolve(): QueryResult {
      if (table === "credit_cards") {
        return opts.cardResult ?? { data: { closing_day: 10, due_day: 20 }, error: null };
      }
      if (table === "transactions") {
        if (mode === "select") return opts.transactionSelectResult ?? { data: null, error: null };
        return { error: null };
      }
      return { data: null, error: null };
    }
    const builder: FakeQueryBuilder = {
      select: () => {
        mode = "select";
        return builder;
      },
      insert: () => {
        mode = "insert";
        return builder;
      },
      update: () => {
        mode = "update";
        return builder;
      },
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => Promise.resolve(resolve()),
      maybeSingle: () => Promise.resolve(resolve()),
      then: (onFulfilled, onRejected) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    return builder;
  }

  return {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: (table: string) => makeBuilder(table),
    rpc: async (name: string, args: RpcArgs) => {
      rpcCalls.push({ name, args });
      if (name === "upsert_credit_card_bill_delta") return { data: { id: "bill-1" }, error: null };
      return { data: null, error: null };
    },
    rpcCalls,
  };
}

function buildFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = {
    type: "expense",
    description: "Compra teste",
    merchant: "",
    amount: "150,00",
    transactionDate: "2026-01-15",
    status: "posted",
    nature: "individual",
    profileId: PROFILE_ID,
    paymentMethod: "account",
    accountId: ACCOUNT_ID,
    creditCardId: "",
    categoryId: "",
    subcategoryId: "",
    notes: "",
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  supabaseRef.current = null;
});

describe("convenção de sinal: conta vs. fatura de cartão", () => {
  it("createTransaction (pagamento em conta): despesa de R$150 gera delta NEGATIVO no saldo da conta", async () => {
    const supabase = makeSupabase();
    supabaseRef.current = supabase;

    const result = await createTransaction({}, buildFormData({ paymentMethod: "account", accountId: ACCOUNT_ID, creditCardId: "" }));
    expect(result?.error).toBeUndefined();
    expect(result?.fieldErrors).toBeUndefined();

    const accountCall = supabase.rpcCalls.find((c) => c.name === "adjust_account_balance");
    expect(accountCall).toBeDefined();
    expect(accountCall!.args.p_delta).toBe(-150);
  });

  it("createTransaction (pagamento em cartão): despesa de R$150 gera delta POSITIVO na fatura (aumenta o que se deve)", async () => {
    const supabase = makeSupabase();
    supabaseRef.current = supabase;

    const result = await createTransaction(
      {},
      buildFormData({ paymentMethod: "credit_card", accountId: "", creditCardId: CARD_ID }),
    );
    expect(result?.error).toBeUndefined();

    const billCall = supabase.rpcCalls.find((c) => c.name === "upsert_credit_card_bill_delta");
    expect(billCall).toBeDefined();
    expect(billCall!.args.p_delta).toBe(150);
  });

  it("a mesma despesa gera sinais OPOSTOS em conta e fatura — exatamente o que o bug real quebrava", async () => {
    const supabaseAccount = makeSupabase();
    supabaseRef.current = supabaseAccount;
    await createTransaction({}, buildFormData({ paymentMethod: "account", accountId: ACCOUNT_ID, creditCardId: "" }));
    const accountDelta = supabaseAccount.rpcCalls.find((c) => c.name === "adjust_account_balance")!.args.p_delta;

    const supabaseBill = makeSupabase();
    supabaseRef.current = supabaseBill;
    await createTransaction({}, buildFormData({ paymentMethod: "credit_card", accountId: "", creditCardId: CARD_ID }));
    const billDelta = Number(supabaseBill.rpcCalls.find((c) => c.name === "upsert_credit_card_bill_delta")!.args.p_delta);

    expect(accountDelta).toBe(-billDelta);
  });

  it("deleteTransaction devolve à conta exatamente o que a transação havia tirado (reversão correta)", async () => {
    const supabase = makeSupabase({
      transactionSelectResult: {
        data: {
          type: "expense",
          amount: 150,
          transaction_date: "2026-01-15",
          account_id: ACCOUNT_ID,
          credit_card_id: null,
        },
        error: null,
      },
    });
    supabaseRef.current = supabase;

    await deleteTransaction("tx-1");

    const accountCall = supabase.rpcCalls.find((c) => c.name === "adjust_account_balance");
    expect(accountCall).toBeDefined();
    // A transação original tirou R$150 da conta (delta -150 ao criar); excluir devolve: +150.
    expect(accountCall!.args.p_delta).toBe(150);
  });

  it("updateTransaction: reverte o delta antigo e aplica o novo com a mesma convenção (sem drift de saldo)", async () => {
    const supabase = makeSupabase({
      transactionSelectResult: {
        data: {
          type: "expense",
          amount: 100,
          transaction_date: "2026-01-10",
          account_id: ACCOUNT_ID,
          credit_card_id: null,
        },
        error: null,
      },
    });
    supabaseRef.current = supabase;

    const result = await updateTransaction(
      {},
      buildFormData({ id: "tx-1", amount: "150,00", paymentMethod: "account", accountId: ACCOUNT_ID, creditCardId: "" }),
    );
    expect(result?.error).toBeUndefined();

    const deltas = supabase.rpcCalls.filter((c) => c.name === "adjust_account_balance").map((c) => c.args.p_delta);
    // 1) reverte a antiga (era despesa de R$100, tirou -100 da conta -> reversão = +100)
    // 2) aplica a nova (despesa de R$150 -> -150 na conta)
    expect(deltas).toEqual([100, -150]);
  });
});
