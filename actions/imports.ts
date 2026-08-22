"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { importUploadSchema, columnMappingSchema, confirmImportSchema } from "@/lib/validations/import";
import { parseCsv } from "@/lib/imports/csv";
import { parseSpreadsheet } from "@/lib/imports/xlsx";
import { parseOfx } from "@/lib/imports/ofx";
import { detectColumns } from "@/lib/imports/detect-columns";
import { applyMapping } from "@/lib/imports/apply-mapping";
import { computeDedupHash, findDuplicateTransaction } from "@/lib/imports/dedup";
import { matchCategory } from "@/lib/imports/categorize";
import { contributionFor, applyBillDelta } from "@/lib/server/credit-card-bills";
import { applyAccountDelta } from "@/lib/server/account-balance";
import type { ActionState } from "@/lib/action-state";
import type { ParsedTransactionRow } from "@/lib/imports/types";
import type { Database, Json } from "@/types/database";

type Supa = SupabaseClient<Database>;

/** `raw_data`/`raw_headers` são sempre objetos/arrays simples (string/número/null) — nunca
 * batem 1:1 com o tipo `Json` gerado (que também aceita array na raiz), daí o cast pontual. */
function asJson(value: unknown): Json {
  return value as Json;
}

/**
 * ETAPA 9 — Imports (Prompt Mestre §25-28, PRD §23-24).
 * Fluxo obrigatório: UPLOAD → PROCESSAMENTO → STAGING (import_rows) → REVISÃO →
 * CONFIRMAÇÃO → transactions. Nunca insere direto em `transactions` a partir de um
 * arquivo enviado.
 */

const EXTENSION_TO_SOURCE: Record<string, Database["public"]["Enums"]["transaction_source"]> = {
  csv: "csv",
  xls: "xlsx",
  xlsx: "xlsx",
  ofx: "ofx",
  pdf: "pdf",
};

function extensionOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/** Processa as linhas já normalizadas: dedup + sugestão de categoria, monta o insert de `import_rows`. */
async function buildRowInserts(
  supabase: Supa,
  householdId: string,
  importId: string,
  destination: { accountId: string | null; creditCardId: string | null; defaultProfileId: string },
  parsedRows: ParsedTransactionRow[],
): Promise<{
  inserts: Database["public"]["Tables"]["import_rows"]["Insert"][];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
}> {
  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("match_type, match_value, category_id, subcategory_id, priority")
    .eq("household_id", householdId)
    .eq("active", true);

  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  const inserts: Database["public"]["Tables"]["import_rows"]["Insert"][] = [];

  for (const row of parsedRows) {
    if (row.error || !row.parsedDate || !row.parsedDescription || row.parsedAmount === null) {
      errorCount++;
      inserts.push({
        import_id: importId,
        raw_data: asJson(row.rawData),
        parsed_date: row.parsedDate,
        parsed_description: row.parsedDescription,
        parsed_amount: row.parsedAmount,
        status: "pending",
        validation_errors: { message: row.error ?? "dados incompletos" },
      });
      continue;
    }

    const dedupHash = computeDedupHash({
      accountId: destination.accountId,
      creditCardId: destination.creditCardId,
      date: row.parsedDate,
      amount: row.parsedAmount,
      description: row.parsedDescription,
    });

    const duplicateId = await findDuplicateTransaction(supabase, householdId, {
      externalId: row.externalId,
      dedupHash,
    });

    const suggestion = matchCategory(rules ?? [], row.parsedDescription);

    let status: Database["public"]["Enums"]["import_row_status"] = "pending";
    if (duplicateId) {
      status = "duplicate";
      duplicateCount++;
    } else if (suggestion) {
      status = "suggested";
    }
    validCount++;

    inserts.push({
      import_id: importId,
      raw_data: asJson({
        ...row.rawData,
        __externalId: row.externalId ?? null,
        __dedupHash: dedupHash,
        // import_rows não tem coluna própria pra subcategoria sugerida (só categoria) —
        // guardada aqui pra a revisão poder pré-selecionar, sem inventar uma coluna nova.
        __suggestedSubcategoryId: suggestion?.subcategoryId ?? null,
      }),
      parsed_date: row.parsedDate,
      parsed_description: row.parsedDescription,
      parsed_amount: row.parsedAmount,
      suggested_category_id: suggestion?.categoryId ?? null,
      suggested_profile_id: destination.defaultProfileId,
      duplicate_candidate_id: duplicateId,
      status,
    });
  }

  return { inserts, validCount, duplicateCount, errorCount };
}

export async function createImport(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = importUploadSchema.safeParse({
    destination: formData.get("destination"),
    accountId: formData.get("accountId"),
    creditCardId: formData.get("creditCardId"),
  });

  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo para importar." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "O arquivo excede o limite de 10 MB." };
  }

  const ext = extensionOf(file.name);
  const sourceType = EXTENSION_TO_SOURCE[ext];
  if (!sourceType) {
    return { error: "Formato não suportado. Envie um arquivo CSV, XLS, XLSX, OFX ou PDF." };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const d = parsed.data;
  const accountId = d.destination === "account" ? (d.accountId ?? null) : null;
  const creditCardId = d.destination === "credit_card" ? (d.creditCardId ?? null) : null;

  const { data: destinationOwner } = accountId
    ? await supabase.from("accounts").select("profile_id").eq("id", accountId).single()
    : await supabase.from("credit_cards").select("profile_id").eq("id", creditCardId!).single();

  if (!destinationOwner) return { error: "Conta/cartão de destino não encontrado." };

  // Upload do arquivo original pro Storage privado ANTES de criar o registro de
  // import, pra nunca ter um import "confirmado" sem o comprovante correspondente.
  const storagePath = `${householdId}/imports/${randomUUID()}/${file.name}`;
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("financial-documents")
    .upload(storagePath, fileBuffer, { contentType: file.type || undefined, upsert: false });

  if (uploadError) {
    return { error: "Não foi possível salvar o arquivo. Tente novamente." };
  }

  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({
      household_id: householdId,
      created_by: user?.id ?? null,
      source_type: sourceType,
      status: "processing",
      filename: file.name,
      storage_path: storagePath,
      account_id: accountId,
      credit_card_id: creditCardId,
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    return { error: "Não foi possível criar a importação. Tente novamente." };
  }

  const importId = importRow.id;
  const destination = { accountId, creditCardId, defaultProfileId: destinationOwner.profile_id };

  if (sourceType === "pdf") {
    // Prompt Mestre Etapa 9: "Criar estrutura PDF" — o pipeline de extração automática
    // de PDF fica preparado (arquivo salvo em Storage privado, registro de import
    // criado), mas a leitura de extratos/faturas em PDF não é implementada nesta
    // etapa (decisão de escopo documentada no status do projeto). Nada é inventado:
    // zero linhas são extraídas, o import fica com status 'failed' e uma nota
    // explicativa em `column_mapping` (reaproveitado como metadado do processamento).
    await supabase
      .from("imports")
      .update({
        status: "failed",
        total_rows: 0,
        column_mapping: { scopeNote: "pdf_not_implemented" },
      })
      .eq("id", importId);

    redirect(`/importar/${importId}`);
  }

  let parsedRows: ParsedTransactionRow[];

  if (sourceType === "ofx") {
    const text = new TextDecoder("utf-8").decode(fileBuffer);
    parsedRows = parseOfx(text);
  } else {
    const grid =
      sourceType === "csv"
        ? parseCsv(new TextDecoder("utf-8").decode(fileBuffer))
        : await parseSpreadsheet(fileBuffer);

    if (grid.rows.length === 0) {
      await supabase.from("imports").update({ status: "failed", total_rows: 0 }).eq("id", importId);
      redirect(`/importar/${importId}`);
    }

    const detection = detectColumns(grid);
    if (!detection.confident) {
      // Staging fica com os dados brutos; a tela de detalhe pede o mapeamento manual
      // (PRD §24) e só então essas linhas ganham parsed_date/description/amount.
      await supabase
        .from("imports")
        .update({ status: "processing", total_rows: grid.rows.length, raw_headers: grid.headers })
        .eq("id", importId);

      const rawInserts = grid.rows.map((cells) => {
        const rawData: Record<string, unknown> = {};
        grid.headers.forEach((h, i) => (rawData[h] = cells[i] ?? ""));
        return {
          import_id: importId,
          raw_data: asJson(rawData),
          status: "pending" as const,
        };
      });
      await supabase.from("import_rows").insert(rawInserts);

      redirect(`/importar/${importId}`);
    }

    await supabase.from("imports").update({ raw_headers: grid.headers, column_mapping: detection.mapping }).eq("id", importId);
    parsedRows = applyMapping(grid, detection.mapping);
  }

  const { inserts, validCount, duplicateCount, errorCount } = await buildRowInserts(
    supabase,
    householdId,
    importId,
    destination,
    parsedRows,
  );

  if (inserts.length > 0) {
    await supabase.from("import_rows").insert(inserts);
  }

  await supabase
    .from("imports")
    .update({
      status: validCount > 0 ? "review" : "failed",
      total_rows: inserts.length,
      valid_rows: validCount,
      duplicate_rows: duplicateCount,
      error_rows: errorCount,
    })
    .eq("id", importId);

  revalidatePath("/importar");
  redirect(`/importar/${importId}`);
}

export async function mapImportColumns(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const importId = String(formData.get("importId") ?? "");
  const mappingRaw = String(formData.get("mapping") ?? "");

  if (!importId) return { error: "Importação inválida." };

  let mappingJson: unknown;
  try {
    mappingJson = JSON.parse(mappingRaw);
  } catch {
    return { error: "Mapeamento inválido." };
  }

  const parsedMapping = columnMappingSchema.safeParse(mappingJson);
  if (!parsedMapping.success) {
    return { error: "Selecione uma coluna para cada campo obrigatório." };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { data: importRecord } = await supabase
    .from("imports")
    .select("id, household_id, account_id, credit_card_id, raw_headers")
    .eq("id", importId)
    .eq("household_id", householdId)
    .single();

  if (!importRecord) return { error: "Importação não encontrada." };

  const headers = (importRecord.raw_headers as string[] | null) ?? [];
  const { data: rawRows } = await supabase
    .from("import_rows")
    .select("id, raw_data")
    .eq("import_id", importId);

  const grid = {
    headers,
    rows: (rawRows ?? []).map((r) => headers.map((h) => String((r.raw_data as Record<string, unknown>)[h] ?? ""))),
  };

  const parsedRows = applyMapping(grid, parsedMapping.data);

  const { data: destinationOwner } = importRecord.account_id
    ? await supabase.from("accounts").select("profile_id").eq("id", importRecord.account_id).single()
    : await supabase.from("credit_cards").select("profile_id").eq("id", importRecord.credit_card_id!).single();

  const destination = {
    accountId: importRecord.account_id,
    creditCardId: importRecord.credit_card_id,
    defaultProfileId: destinationOwner?.profile_id ?? "",
  };

  const { inserts, validCount, duplicateCount, errorCount } = await buildRowInserts(
    supabase,
    householdId,
    importId,
    destination,
    parsedRows,
  );

  // Substitui as linhas de staging brutas pelas versões já processadas (mesma
  // quantidade de linhas, agora com parsed_*/status/dedup corretos).
  await supabase.from("import_rows").delete().eq("import_id", importId);
  if (inserts.length > 0) {
    await supabase.from("import_rows").insert(inserts);
  }

  await supabase
    .from("imports")
    .update({
      status: validCount > 0 ? "review" : "failed",
      column_mapping: parsedMapping.data,
      total_rows: inserts.length,
      valid_rows: validCount,
      duplicate_rows: duplicateCount,
      error_rows: errorCount,
    })
    .eq("id", importId);

  revalidatePath(`/importar/${importId}`);
  return { success: "Colunas mapeadas." };
}

export async function confirmImport(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const raw = String(formData.get("payload") ?? "");
  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(raw);
  } catch {
    return { error: "Dados de confirmação inválidos." };
  }

  const parsed = confirmImportSchema.safeParse(payloadJson);
  if (!parsed.success) return { error: "Revise as linhas selecionadas e tente novamente." };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: importRecord } = await supabase
    .from("imports")
    .select("id, status, account_id, credit_card_id, source_type")
    .eq("id", parsed.data.importId)
    .eq("household_id", householdId)
    .single();

  if (!importRecord) return { error: "Importação não encontrada." };
  if (importRecord.status !== "review") {
    return { error: "Esta importação já foi confirmada ou não está pronta para revisão." };
  }

  let importedCount = 0;

  for (const row of parsed.data.rows) {
    if (!row.include) {
      await supabase.from("import_rows").update({ status: "ignored" }).eq("id", row.id).eq("import_id", importRecord.id);
      continue;
    }

    // Revalida duplicidade no momento da confirmação (defensivo: a revisão pode ter
    // ficado aberta um tempo e outra transação real já ter sido criada nesse meio-tempo).
    const dedupHash = computeDedupHash({
      accountId: importRecord.account_id,
      creditCardId: importRecord.credit_card_id,
      date: row.date,
      amount: row.amount,
      description: row.description,
    });
    const duplicateId = await findDuplicateTransaction(supabase, householdId, { dedupHash });
    if (duplicateId) {
      await supabase
        .from("import_rows")
        .update({ status: "duplicate", duplicate_candidate_id: duplicateId })
        .eq("id", row.id)
        .eq("import_id", importRecord.id);
      continue;
    }

    const type: Database["public"]["Enums"]["transaction_type"] = row.amount < 0 ? "expense" : "income";
    const amount = Math.abs(row.amount);
    // Fatura: despesa = +valor (aumenta o que se deve). Conta: convenção oposta —
    // entrada positiva, saída negativa — por isso `-billContribution`.
    const billContribution = contributionFor(type, amount);

    let creditCardBillId: string | null = null;
    if (importRecord.credit_card_id) {
      creditCardBillId = await applyBillDelta(supabase, householdId, importRecord.credit_card_id, row.date, billContribution);
    }
    if (importRecord.account_id) {
      await applyAccountDelta(supabase, importRecord.account_id, -billContribution);
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      household_id: householdId,
      profile_id: row.profileId,
      account_id: importRecord.account_id,
      credit_card_id: importRecord.credit_card_id,
      credit_card_bill_id: creditCardBillId,
      type,
      description: row.description,
      amount,
      transaction_date: row.date,
      status: "posted",
      category_id: row.categoryId ?? null,
      subcategory_id: row.subcategoryId ?? null,
      nature: "individual",
      source: importRecord.source_type,
      import_id: importRecord.id,
      deduplication_hash: dedupHash,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      await supabase
        .from("import_rows")
        .update({ validation_errors: { message: "Não foi possível criar a transação." } })
        .eq("id", row.id)
        .eq("import_id", importRecord.id);
      continue;
    }

    importedCount++;
    await supabase.from("import_rows").update({ status: "confirmed" }).eq("id", row.id).eq("import_id", importRecord.id);
  }

  await supabase
    .from("imports")
    .update({ status: "completed", imported_rows: importedCount, completed_at: new Date().toISOString() })
    .eq("id", importRecord.id);

  revalidatePath("/importar");
  revalidatePath(`/importar/${importRecord.id}`);
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/cartoes");
  return { success: `${importedCount} transações importadas.` };
}

export async function cancelImport(importId: string): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { error } = await supabase
    .from("imports")
    .update({ status: "cancelled" })
    .eq("id", importId)
    .eq("household_id", householdId)
    .in("status", ["uploaded", "processing", "review"]);

  if (error) return { error: "Não foi possível cancelar a importação." };

  revalidatePath("/importar");
  revalidatePath(`/importar/${importId}`);
  return { success: "Importação cancelada." };
}
