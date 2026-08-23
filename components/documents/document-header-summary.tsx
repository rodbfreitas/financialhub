import { Card, CardContent } from "@/components/ui/card";
import type { DocumentHeaderFacts } from "@/lib/documents/document-header";

function formatMoney(n: number | null): string | null {
  if (n === null) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * Resumo do documento (Macrofase 5 — PRD 2.0 §9.1/§9.3): vencimento, total e
 * pagamento mínimo de uma fatura, ou saldo inicial/final de um extrato. Sempre
 * como CONTEXTO, num card separado — nunca misturado com a lista de lançamentos
 * identificados (`DocumentEventsList`), porque não é um lançamento.
 */
export function DocumentHeaderSummary({ facts }: { facts: DocumentHeaderFacts }) {
  const fields =
    facts.kind === "fatura_cartao"
      ? [
          { label: "Cartão", value: facts.cardLast4 ? `final ${facts.cardLast4}` : null },
          { label: "Fechamento", value: formatDate(facts.closingDate) },
          { label: "Vencimento", value: formatDate(facts.dueDate) },
          { label: "Total da fatura", value: formatMoney(facts.totalAmount) },
          { label: "Pagamento mínimo", value: formatMoney(facts.minimumPayment) },
        ]
      : [
          { label: "Saldo inicial", value: formatMoney(facts.initialBalance) },
          { label: "Saldo final", value: formatMoney(facts.finalBalance) },
        ];

  const found = fields.filter((f) => f.value !== null);
  if (found.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Resumo do documento</h2>
          <p className="text-xs text-muted-foreground">
            Leitura automática, só como contexto — nunca é lançada como transação.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {found.map((f) => (
            <div key={f.label} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{f.label}</span>
              <span className="font-medium tabular-nums text-foreground">{f.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
