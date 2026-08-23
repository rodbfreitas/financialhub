import type { Database } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type EventType = Database["public"]["Enums"]["financial_event_type"];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  purchase: "Compra",
  income: "Receita",
  payment: "Pagamento",
  transfer: "Transferência",
  pix_sent: "PIX enviado",
  pix_received: "PIX recebido",
  boleto_payment: "Pagamento de boleto",
  card_payment: "Pagamento de fatura",
  refund: "Estorno",
  fee: "Tarifa",
  interest: "Juros",
  penalty: "Multa",
  yield: "Rendimento",
  withdrawal: "Saque",
  deposit: "Depósito",
  installment: "Parcela",
  direct_debit: "Débito automático",
  unknown: "Não identificado",
};

function formatMoney(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export type DocumentEventRow = {
  id: string;
  raw_description: string | null;
  interpreted_financial_events: {
    event_type: EventType;
    amount: number | null;
    effective_date: string | null;
    merchant_normalized: string | null;
    interpretation_confidence: number | null;
    installment_current: number | null;
    installment_total: number | null;
  }[];
};

/**
 * Lista os eventos financeiros interpretados a partir do documento (camada
 * "Interpretado" — ainda NÃO são transações). Confiança sempre mostrada como texto
 * qualitativo, nunca só um número solto (Design System 2.0 §"nunca score como único
 * indicador"). A confirmação em lote (transformar isso em transação de verdade) é
 * uma macrofase futura — aqui é só leitura, pra o usuário conferir o que foi lido.
 */
export function DocumentEventsList({ events }: { events: DocumentEventRow[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Lançamentos identificados</h2>
          <p className="text-xs text-muted-foreground">
            Leitura automática, ainda não confirmada — a confirmação em lote chega numa próxima etapa.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {events.map((row) => {
            const interpreted = row.interpreted_financial_events?.[0];
            if (!interpreted) return null;
            const confidence = interpreted.interpretation_confidence ?? 0;
            const confidenceLabel = confidence >= 0.6 ? "Confiança razoável" : "Confiança baixa — confira";
            return (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {interpreted.merchant_normalized || row.raw_description || "Descrição não identificada"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {EVENT_TYPE_LABELS[interpreted.event_type]} · {formatDate(interpreted.effective_date)}
                    {interpreted.installment_current && interpreted.installment_total
                      ? ` · Parcela ${interpreted.installment_current}/${interpreted.installment_total}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={confidence >= 0.6 ? "outline" : "warning"}>{confidenceLabel}</Badge>
                  <span className="font-medium tabular-nums text-foreground">{formatMoney(interpreted.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
