import { describe, expect, it } from "vitest";
import { extractSingleEventCandidate } from "@/lib/documents/providers/single-event-extraction";

describe("extractSingleEventCandidate", () => {
  it("extrai valor e data de um comprovante em formato de formulário (rótulo/valor em linhas separadas)", () => {
    const text = ["Comprovante de transferência PIX", "Valor: R$ 150,00", "Data: 15/03/2026", "Para: João Silva"].join(
      "\n",
    );

    const candidate = extractSingleEventCandidate(text);
    expect(candidate).not.toBeNull();
    expect(candidate?.parsedAmount).toBeCloseTo(150);
    expect(candidate?.parsedDate).toBe("2026-03-15");
    expect(candidate?.rawDescription).toBe("João Silva");
    expect(candidate?.direction).toBe("debit");
  });

  it("infere direção 'credit' quando só há pagador (dinheiro entrando)", () => {
    const text = ["Comprovante PIX recebido", "Valor: R$ 80,00", "Data: 10/01/2026", "De: Maria Souza"].join("\n");

    const candidate = extractSingleEventCandidate(text);
    expect(candidate?.direction).toBe("credit");
    expect(candidate?.rawDescription).toBe("Maria Souza");
  });

  it("não confunde preposições comuns ('de', 'para' no meio de frase) com rótulo de pagador/beneficiário", () => {
    const text = ["Comprovante de pagamento", "Valor: R$ 45,00", "Data: 05/02/2026", "Pagamento realizado com sucesso"].join(
      "\n",
    );

    const candidate = extractSingleEventCandidate(text);
    expect(candidate?.direction).toBeNull();
    expect(candidate?.rawDescription).toBeNull();
  });

  it("retorna null quando não encontra nem valor nem data (nunca inventa um evento)", () => {
    expect(extractSingleEventCandidate("documento sem nenhum campo reconhecivel")).toBeNull();
  });
});
