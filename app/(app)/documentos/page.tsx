import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileScan } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog";
import { DocumentCard, type DocumentCardData } from "@/components/documents/document-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Documentos — Financial Hub Familiar" };

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <FileScan className="size-8" />
        <p>{message}</p>
      </CardContent>
    </Card>
  );
}

function DocList({ items, empty }: { items: DocumentCardData[]; empty: string }) {
  if (items.length === 0) return <EmptyState message={empty} />;
  return (
    <div className="flex flex-col gap-2">
      {items.map((d) => (
        <DocumentCard key={d.id} doc={d} />
      ))}
    </div>
  );
}

/**
 * DOC-01 — Inbox de Documentos (UX 2.0). Evolução do domínio de Importações — não é
 * um produto paralelo (§30 guardrails). Filtros seguem a hierarquia recomendada:
 * revisão pendente primeiro, depois processando, depois concluídos.
 */
export default async function DocumentosPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const [{ data: documents }, { data: profiles }] = await Promise.all([
    supabase
      .from("financial_documents")
      .select("id, original_filename, mime_type, document_type, status, created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const docs = (documents ?? []) as DocumentCardData[];
  const toReview = docs.filter((d) => d.status === "ready_for_review" || d.status === "partial");
  const processing = docs.filter((d) => d.status === "received" || d.status === "processing");
  const done = docs.filter((d) => d.status === "reviewed" || d.status === "archived" || d.status === "failed");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Envie faturas, extratos, boletos ou comprovantes — você revisa e confirma antes de qualquer
            transação ser criada.
          </p>
        </div>
        <DocumentUploadDialog profiles={profiles ?? []} />
      </div>

      {docs.length === 0 ? (
        <EmptyState message="Nenhum documento enviado ainda." />
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos ({docs.length})</TabsTrigger>
            <TabsTrigger value="review">Para revisar ({toReview.length})</TabsTrigger>
            <TabsTrigger value="processing">Processando ({processing.length})</TabsTrigger>
            <TabsTrigger value="done">Concluídos ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <DocList items={docs} empty="Nenhum documento." />
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            <DocList items={toReview} empty="Nada para revisar por aqui." />
          </TabsContent>
          <TabsContent value="processing" className="mt-4">
            <DocList items={processing} empty="Nada em processamento." />
          </TabsContent>
          <TabsContent value="done" className="mt-4">
            <DocList items={done} empty="Nenhum documento concluído ainda." />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
