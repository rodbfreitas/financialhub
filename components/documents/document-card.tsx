import Link from "next/link";
import { FileText, Image as ImageIcon, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import type { Database } from "@/types/database";

type DocumentType = Database["public"]["Enums"]["document_type"];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  fatura_cartao: "Fatura de cartão",
  extrato_bancario: "Extrato bancário",
  boleto: "Boleto",
  comprovante_pagamento: "Comprovante de pagamento",
  comprovante_pix: "Comprovante PIX",
  comprovante_transferencia: "Comprovante de transferência",
  documento_bancario_generico: "Documento bancário",
  documento_desconhecido: "Aguardando identificação",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export type DocumentCardData = {
  id: string;
  original_filename: string;
  mime_type: string;
  document_type: DocumentType;
  status: Database["public"]["Enums"]["financial_document_status"];
  created_at: string;
};

export function DocumentCard({ doc }: { doc: DocumentCardData }) {
  const Icon = doc.mime_type === "application/pdf" ? FileText : doc.mime_type.startsWith("image/") ? ImageIcon : HelpCircle;

  return (
    <Link href={`/documentos/${doc.id}`}>
      <Card className="transition-colors hover:bg-secondary/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{doc.original_filename}</p>
              <p className="text-xs text-muted-foreground">
                {DOCUMENT_TYPE_LABELS[doc.document_type]} · {formatDateTime(doc.created_at)}
              </p>
            </div>
          </div>
          <DocumentStatusBadge status={doc.status} />
        </CardContent>
      </Card>
    </Link>
  );
}
