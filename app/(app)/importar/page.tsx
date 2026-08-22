import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { ImportUploadDialog } from "@/components/imports/import-upload-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Importar dados — Financial Hub Familiar" };

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Enviado",
  processing: "Aguardando mapeamento",
  review: "Aguardando revisão",
  confirmed: "Confirmado",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<string, "outline" | "warning" | "positive" | "negative"> = {
  uploaded: "outline",
  processing: "warning",
  review: "warning",
  confirmed: "positive",
  completed: "positive",
  failed: "negative",
  cancelled: "outline",
};

const SOURCE_LABELS: Record<string, string> = {
  csv: "CSV",
  xlsx: "Excel",
  ofx: "OFX",
  pdf: "PDF",
  manual: "Manual",
  open_finance: "Open Finance",
  api: "API",
  ai: "IA",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ImportarPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const [{ data: imports }, { data: accounts }, { data: creditCards }] = await Promise.all([
    supabase
      .from("imports")
      .select(
        "id, filename, source_type, status, total_rows, valid_rows, duplicate_rows, error_rows, imported_rows, created_at, accounts(name), credit_cards(name)",
      )
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("credit_cards")
      .select("id, name")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const hasImports = !!imports && imports.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Importar dados</h1>
          <p className="text-sm text-muted-foreground">
            Envie um extrato ou fatura em Excel, CSV, OFX ou PDF — você revisa e confirma antes de qualquer
            transação ser criada.
          </p>
        </div>
        <ImportUploadDialog accounts={accounts ?? []} creditCards={creditCards ?? []} />
      </div>

      {!hasImports ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Upload className="size-8" />
            <p>Nenhuma importação ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {imports.map((imp) => {
            const Icon = imp.source_type === "pdf" ? FileType : imp.source_type === "xlsx" ? FileSpreadsheet : FileText;
            const destination = imp.accounts?.name ?? imp.credit_cards?.name ?? "—";
            return (
              <Link key={imp.id} href={`/importar/${imp.id}`}>
                <Card className="transition-colors hover:bg-secondary/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-secondary">
                        <Icon className="size-4 text-muted-foreground" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{imp.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[imp.source_type] ?? imp.source_type} · {destination} ·{" "}
                          {formatDateTime(imp.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {imp.status === "completed" ? (
                        <span>{imp.imported_rows} importadas</span>
                      ) : imp.status === "review" ? (
                        <span>
                          {imp.valid_rows} válidas
                          {imp.duplicate_rows > 0 ? ` · ${imp.duplicate_rows} duplicadas` : ""}
                        </span>
                      ) : null}
                      <Badge variant={STATUS_VARIANT[imp.status] ?? "outline"}>
                        {STATUS_LABELS[imp.status] ?? imp.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
