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

const SUBTITLE_BY_KIND: Record<DocumentHeaderFacts["kind"], string> = {
  fatura_cartao: "Leitura automática, só como contexto — nunca é lançada como transação.",
  extrato_bancario: "Leitura automática, só como contexto — nunca é lançada como transação.",
  // PRD 2.0 §9.4: existir o boleto não significa que a despesa foi paga — por isso
  // ele nunca vira um lançamento sozinho (só quando um comprovante correspondente
  // aparecer, ou pela reconciliação de uma macrofase futura).
  boleto: "Obrigação em aberto — o boleto existir não significa que já foi pago.",
};

/**
 * Resumo do documento (Macrofase 5-6 — PRD 2.0 §9.1/§9.3/§9.4): vencimento, total e
 * pagamento mínimo de uma fatura; saldo inicial/final de um extrato; ou
 * beneficiário/valor/vencimento/linha digitável de um boleto. Sempre como
 * CONTEXTO, num card separado — nunca misturado com a lista de lançamentos
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
      : facts.kind === "extrato_bancario"
        ? [
            { label: "Saldo inicial", value: formatMoney(facts.initialBalance) },
            { label: "Saldo final", value: formatMoney(facts.finalBalance) },
          ]
        : [
            { label: "Beneficiário", value: facts.beneficiary },
            { label: "Vencimento", value: formatDate(facts.dueDate) },
            { label: "Valor", value: formatMoney(facts.amount) },
            { label: "Linha digitável", value: facts.digitableLine },
          ];

  const found = fields.filter((f) => f.value !== null);
  if (found.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Resumo do documento</h2>
          <p className="text-xs text-muted-foreground">{SUBTITLE_BY_KIND[facts.kind]}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {found.map((f) => (
            <div key={f.label} className={f.label === "Linha digitável" ? "col-span-2 flex flex-col sm:col-span-3" : "flex flex-col"}>
              <span className="text-xs text-muted-foreground">{f.label}</span>
              <span
                className={
                  f.label === "Linha digitável"
                    ? "break-all font-mono text-xs text-foreground"
                    : "font-medium tabular-nums text-foreground"
                }
              >
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
