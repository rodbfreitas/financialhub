import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, FileWarning, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { ImportColumnMappingForm } from "@/components/imports/import-column-mapping-form";
import { ImportReviewTable, type ReviewRow } from "@/components/imports/import-review-table";
import { ImportDestinationForm } from "@/components/imports/import-destination-form";
import { CancelImportButton } from "@/components/imports/cancel-import-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Detalhe da importação — Financial Hub Familiar" };

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const { data: imp } = await supabase
    .from("imports")
    .select(
      "id, filename, source_type, status, total_rows, valid_rows, duplicate_rows, error_rows, imported_rows, raw_headers, column_mapping, account_id, credit_card_id, accounts(name, profile_id), credit_cards(name, profile_id), created_at",
    )
    .eq("id", id)
    .eq("household_id", householdId)
    .single();

  if (!imp) notFound();

  const destinationName = imp.accounts?.name ?? imp.credit_cards?.name ?? "—";
  const defaultProfileId = imp.accounts?.profile_id ?? imp.credit_cards?.profile_id ?? "";
  // Fase 2 — Macrofase 9/10: um import "ai" nasce de exatamente um documento
  // (`getOrCreateImportForDocument`); a busca reversa por `import_id` traz a origem
  // pra exibir o link de rastreabilidade, sem misturar documento e ledger na mesma
  // entidade (guardrail UX/UI 2.0 §30) — só um link de referência.
  const needsDestination = imp.source_type === "ai" && imp.status === "review" && !imp.account_id && !imp.credit_card_id;

  const [{ data: rows }, { data: categories }, { data: profiles }, { data: accounts }, { data: creditCards }, { data: sourceDocument }] =
    await Promise.all([
      supabase.from("import_rows").select("*").eq("import_id", id).order("created_at", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, subcategories(id, name)")
        .eq("household_id", householdId)
        .eq("active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, name")
        .eq("household_id", householdId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      needsDestination
        ? supabase
            .from("accounts")
            .select("id, name")
            .eq("household_id", householdId)
            .eq("active", true)
            .is("deleted_at", null)
            .order("name", { ascending: true })
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      needsDestination
        ? supabase
            .from("credit_cards")
            .select("id, name")
            .eq("household_id", householdId)
            .eq("active", true)
            .is("deleted_at", null)
            .order("name", { ascending: true })
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      imp.source_type === "ai"
        ? supabase.from("financial_documents").select("id, original_filename").eq("import_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const categoryOptions = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));
  const profileOptions = profiles ?? [];

  const scopeNote =
    imp.column_mapping && typeof imp.column_mapping === "object" && "scopeNote" in imp.column_mapping
      ? (imp.column_mapping as { scopeNote?: string }).scopeNote
      : undefined;

  const needsMapping = imp.status === "processing" && !!imp.raw_headers && !imp.column_mapping;

  let reviewRows: ReviewRow[] = [];
  if (imp.status === "review") {
    reviewRows = (rows ?? []).map((r) => {
      const hasError = !!r.validation_errors;
      const isDuplicate = r.status === "duplicate";
      const amount = r.parsed_amount !== null ? Number(r.parsed_amount) : null;
      const rawData = (r.raw_data ?? {}) as Record<string, unknown>;
      const suggestedSubcategoryId =
        typeof rawData.__suggestedSubcategoryId === "string" ? rawData.__suggestedSubcategoryId : "";
      const errorMessage =
        r.validation_errors && typeof r.validation_errors === "object" && "message" in r.validation_errors
          ? String((r.validation_errors as { message?: unknown }).message ?? "")
          : undefined;

      return {
        id: r.id,
        isDuplicate,
        hasError,
        errorMessage,
        include: !isDuplicate && !hasError,
        date: r.parsed_date ?? "",
        description: r.parsed_description ?? "",
        type: amount !== null && amount < 0 ? "expense" : "income",
        amountText: amount !== null ? Math.abs(amount).toFixed(2).replace(".", ",") : "",
        profileId: r.suggested_profile_id ?? defaultProfileId,
        categoryId: r.suggested_category_id ?? "",
        subcategoryId: suggestedSubcategoryId,
      };
    });
  }

  let sampleGrid: string[][] = [];
  if (needsMapping) {
    const headers = (imp.raw_headers as string[]) ?? [];
    sampleGrid = (rows ?? [])
      .slice(0, 5)
      .map((r) => headers.map((h) => String((r.raw_data as Record<string, unknown>)[h] ?? "")));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/importar"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Importações
          </Link>
          <h1 className="text-xl font-semibold">{imp.filename}</h1>
          <p className="text-sm text-muted-foreground">Destino: {destinationName}</p>
          {sourceDocument ? (
            <Link
              href={`/documentos/${sourceDocument.id}`}
              className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="size-3.5" /> Documento de origem: {sourceDocument.original_filename}
            </Link>
          ) : null}
        </div>
        {(imp.status === "processing" || imp.status === "failed") && (
          <CancelImportButton importId={imp.id} />
        )}
      </div>

      {needsMapping ? (
        <ImportColumnMappingForm
          importId={imp.id}
          headers={(imp.raw_headers as string[]) ?? []}
          sampleRows={sampleGrid}
        />
      ) : null}

      {imp.status === "review" && needsDestination ? (
        <ImportDestinationForm importId={imp.id} accounts={accounts ?? []} creditCards={creditCards ?? []} />
      ) : null}

      {imp.status === "review" && !needsDestination ? (
        <ImportReviewTable
          importId={imp.id}
          rows={reviewRows}
          profiles={profileOptions}
          categories={categoryOptions}
          defaultProfileId={defaultProfileId}
        />
      ) : null}

      {imp.status === "failed" && scopeNote === "pdf_not_implemented" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <FileWarning className="size-8" />
            <p className="font-medium text-foreground">Leitura automática de PDF ainda não disponível</p>
            <p className="max-w-md text-sm">
              O arquivo foi salvo com segurança no seu armazenamento privado, mas a extração automática de
              transações de PDFs (extratos e faturas) ainda não foi implementada nesta etapa. Você pode lançar
              essas transações manualmente em Transações, ou reenviar como CSV/XLSX/OFX se tiver essa opção no
              seu banco.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {imp.status === "failed" && scopeNote !== "pdf_not_implemented" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <XCircle className="size-8" />
            <p className="font-medium text-foreground">Nenhuma transação válida encontrada</p>
            <p className="max-w-md text-sm">
              Não conseguimos identificar transações neste arquivo. Confira se o arquivo corresponde ao formato
              esperado e tente enviar novamente.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {imp.status === "completed" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <CheckCircle2 className="size-8 text-positive" />
            <p className="font-medium text-foreground">{imp.imported_rows} transações importadas</p>
            <p className="text-sm">
              de {imp.total_rows} linhas encontradas ({imp.duplicate_rows} duplicadas, {imp.error_rows} com erro).
            </p>
            <Link href="/transacoes" className="text-sm font-medium text-primary hover:underline">
              Ver transações
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {imp.status === "cancelled" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Badge variant="outline">Cancelada</Badge>
            <p className="text-sm">Nenhuma transação foi criada a partir desta importação.</p>
          </CardContent>
        </Card>
      ) : null}

      {imp.status === "uploaded" || (imp.status === "processing" && !needsMapping) ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <p className="text-sm">Processando arquivo…</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
