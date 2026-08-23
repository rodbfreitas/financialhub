import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { ProcessingStatusPoller } from "@/components/documents/processing-status-poller";
import { DocumentEventsList, type DocumentEventRow } from "@/components/documents/document-events-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Documento — Financial Hub Familiar" };

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  fatura_cartao: "Fatura de cartão",
  extrato_bancario: "Extrato bancário",
  boleto: "Boleto",
  comprovante_pagamento: "Comprovante de pagamento",
  comprovante_pix: "Comprovante PIX",
  comprovante_transferencia: "Comprovante de transferência",
  documento_bancario_generico: "Documento bancário",
  documento_desconhecido: "Aguardando identificação",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * DOC-07 (versão inicial — Macrofase 2). Mostra metadados reais do documento e um
 * link de evidência via signed URL de curta duração (ERD 2.0 §Segurança: nunca
 * bucket público, sempre signed URL server-side). Abas de Movimentações/Evidências/
 * Histórico (spec completa da UX 2.0) chegam nas macrofases de extração/revisão —
 * aqui só existe o que já é real: o documento enviado e seu status.
 */
export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) redirect("/onboarding");

  const { data: doc } = await supabase
    .from("financial_documents")
    .select(
      "id, original_filename, mime_type, file_size_bytes, document_type, status, storage_bucket, storage_path, created_at, institution_name, profiles(name)",
    )
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (!doc) notFound();

  const isProcessingState = doc.status === "received" || doc.status === "processing";
  const showEvents = doc.status === "ready_for_review" || doc.status === "reviewed" || doc.status === "partial";

  const [{ data: signed }, { data: latestRun }, { data: events }] = await Promise.all([
    supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 60 * 5),
    isProcessingState || doc.status === "failed" || doc.status === "partial"
      ? supabase
          .from("document_processing_runs")
          .select("status, error_code, error_detail, metrics")
          .eq("document_id", id)
          .order("run_number", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    showEvents
      ? supabase
          .from("extracted_financial_events")
          .select(
            "id, raw_description, interpreted_financial_events(event_type, amount, effective_date, merchant_normalized, interpretation_confidence, installment_current, installment_total, is_current)",
          )
          .eq("document_id", id)
          .order("source_event_index", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Link href="/documentos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Documentos
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{doc.original_filename}</h1>
          <p className="text-sm text-muted-foreground">
            {DOCUMENT_TYPE_LABELS[doc.document_type]} · Enviado em {formatDateTime(doc.created_at)}
          </p>
        </div>
        <DocumentStatusBadge status={doc.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tamanho</span>
            <span className="text-foreground">{formatBytes(doc.file_size_bytes)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tipo de arquivo</span>
            <span className="text-foreground">{doc.mime_type}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Titular sugerido</span>
            <span className="text-foreground">{doc.profiles?.name ?? "Não informado"}</span>
          </div>
        </CardContent>
      </Card>

      {signed?.signedUrl ? (
        <div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={signed.signedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Abrir arquivo original
            </a>
          </Button>
        </div>
      ) : null}

      {isProcessingState ? (
        <>
          <ProcessingStatusPoller />
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {doc.status === "received"
                ? "Documento recebido e guardado com segurança. A leitura automática vai começar em instantes."
                : "Lendo o documento e identificando lançamentos automaticamente. Isso costuma levar poucos segundos — esta página se atualiza sozinha."}
            </CardContent>
          </Card>
        </>
      ) : null}

      {doc.status === "failed" ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Não conseguimos processar este documento automaticamente
            {latestRun?.error_code === "unsupported_type" ? " (formato de arquivo sem suporte)." : "."} Você ainda
            pode abrir o arquivo original acima e lançar os valores manualmente.
          </CardContent>
        </Card>
      ) : null}

      {doc.status === "partial" && latestRun?.error_code === "no_ocr_provider" ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Este documento é uma imagem — a leitura automática de imagens ainda não está disponível neste
            momento. Você pode abrir o arquivo original acima e conferir o conteúdo manualmente.
          </CardContent>
        </Card>
      ) : null}

      {doc.status === "partial" && latestRun?.error_code !== "no_ocr_provider" ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Conseguimos ler o documento, mas não encontramos lançamentos com data e valor reconhecíveis
            automaticamente. Você pode abrir o arquivo original acima e conferir o conteúdo manualmente.
          </CardContent>
        </Card>
      ) : null}

      {showEvents ? <DocumentEventsList events={(events ?? []) as DocumentEventRow[]} /> : null}
    </div>
  );
}
