import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { getReviewQueueForDocument, sortQueueItems } from "@/lib/documents/review/queue";
import { ReviewQueue } from "@/components/documents/review-queue";

export const metadata: Metadata = { title: "Revisar documento — Financial Hub Familiar" };

/**
 * DOC-05 (Fila de Revisão) — Fase 2, Macrofase 8. Entrada natural pelo botão
 * "Abrir revisão" na tela de detalhe do documento (`/documentos/[id]`).
 */
export default async function DocumentReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) redirect("/onboarding");

  const { data: doc } = await supabase
    .from("financial_documents")
    .select("id, original_filename")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!doc) notFound();

  const items = sortQueueItems(await getReviewQueueForDocument(supabase, id));

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Revisar {doc.original_filename}</h1>
        <p className="text-sm text-muted-foreground">
          Cada decisão é salva na hora. Você pode fechar e voltar depois — o que faltar continua aqui.
        </p>
      </div>
      <ReviewQueue documentId={id} initialItems={items} />
    </div>
  );
}
