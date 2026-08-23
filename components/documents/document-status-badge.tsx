import { Clock, Loader2, AlertTriangle, CheckCircle2, XCircle, Archive } from "lucide-react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["financial_document_status"];
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/**
 * Status do documento nunca é só cor (Design System 2.0 §"Status" — acessibilidade:
 * "status nunca deve depender só de cor"). Sempre texto + ícone + cor.
 */
const STATUS_META: Record<Status, { label: string; variant: BadgeVariant; icon: typeof Clock }> = {
  received: { label: "Recebido", variant: "outline", icon: Clock },
  processing: { label: "Processando", variant: "info", icon: Loader2 },
  ready_for_review: { label: "Para revisar", variant: "warning", icon: AlertTriangle },
  reviewed: { label: "Revisado", variant: "positive", icon: CheckCircle2 },
  partial: { label: "Parcial", variant: "warning", icon: AlertTriangle },
  failed: { label: "Falhou", variant: "negative", icon: XCircle },
  archived: { label: "Arquivado", variant: "outline", icon: Archive },
};

export function DocumentStatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className={cnAnimate(status)} />
      {meta.label}
    </Badge>
  );
}

function cnAnimate(status: Status): string {
  return status === "processing" ? "size-3 animate-spin" : "size-3";
}
