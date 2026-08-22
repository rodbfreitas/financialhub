import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/imports/csv";
import { detectColumns } from "@/lib/imports/detect-columns";
import { applyMapping } from "@/lib/imports/apply-mapping";
import { matchCategory } from "@/lib/imports/categorize";
import { computeDedupHash } from "@/lib/imports/dedup";

/**
 * Integração real do pipeline de importação (Etapa 9 / PRD §23-24): prova que os
 * módulos, testados isoladamente em tests/unit/imports-*.test.ts, também funcionam
 * corretamente ENCADEADOS na ordem real usada por actions/imports.ts —
 * parseCsv → detectColumns → applyMapping → matchCategory → computeDedupHash — com
 * a saída de cada estágio alimentando o próximo sem transformação manual no teste.
 */
describe("pipeline de importação: CSV bruto até linha pronta para revisão", () => {
  // Delimitador ";" (padrão comum em extratos de banco brasileiro) — evita ambiguidade
  // com a vírgula decimal do valor ("-89,90"), que um delimitador "," quebraria ao meio.
  const CSV = [
    "Data;Descrição;Valor",
    "15/01/2026;Compra Supermercado ABC;-89,90",
    "16/01/2026;Salário Empresa XYZ;1500,00",
    '20/01/2026;"Uber, viagem 42";-32,50',
  ].join("\n");

  it("processa um CSV de extrato real do início ao fim", () => {
    const grid = parseCsv(CSV);
    expect(grid.headers).toEqual(["Data", "Descrição", "Valor"]);
    expect(grid.rows).toHaveLength(3);

    const detection = detectColumns(grid);
    expect(detection.confident).toBe(true);
    if (!detection.confident) throw new Error("esperava detecção confiante");

    const mapped = applyMapping(grid, detection.mapping);
    expect(mapped).toHaveLength(3);
    expect(mapped[0]).toMatchObject({
      parsedDate: "2026-01-15",
      parsedDescription: "Compra Supermercado ABC",
      parsedAmount: -89.9,
    });
    expect(mapped[1]).toMatchObject({ parsedDate: "2026-01-16", parsedAmount: 1500 });
    expect(mapped[2]).toMatchObject({ parsedDescription: "Uber, viagem 42", parsedAmount: -32.5 });
    for (const row of mapped) expect(row.error).toBeUndefined();

    const rules = [
      { match_type: "contains" as const, match_value: "supermercado", category_id: "food", subcategory_id: null, priority: 0 },
      { match_type: "contains" as const, match_value: "uber", category_id: "transport", subcategory_id: null, priority: 0 },
    ];
    const categories = mapped.map((row) => matchCategory(rules, row.parsedDescription ?? ""));
    expect(categories[0]).toEqual({ categoryId: "food", subcategoryId: null });
    expect(categories[1]).toBeNull(); // salário não bate em nenhuma regra de despesa
    expect(categories[2]).toEqual({ categoryId: "transport", subcategoryId: null });

    const hashes = mapped.map((row) =>
      computeDedupHash({
        accountId: "acc-1",
        creditCardId: null,
        date: row.parsedDate!,
        amount: row.parsedAmount!,
        description: row.parsedDescription!,
      }),
    );
    // Cada linha real e distinta gera um hash diferente das outras.
    expect(new Set(hashes).size).toBe(3);

    // Reimportar o MESMO extrato (mesma conta) gera os MESMOS hashes — é assim que
    // confirmImport detecta duplicata (findDuplicateTransaction por deduplication_hash).
    const grid2 = parseCsv(CSV);
    const detection2 = detectColumns(grid2);
    if (!detection2.confident) throw new Error("esperava detecção confiante");
    const mapped2 = applyMapping(grid2, detection2.mapping);
    const hashes2 = mapped2.map((row) =>
      computeDedupHash({
        accountId: "acc-1",
        creditCardId: null,
        date: row.parsedDate!,
        amount: row.parsedAmount!,
        description: row.parsedDescription!,
      }),
    );
    expect(hashes2).toEqual(hashes);
  });

  it("linha inválida no meio do arquivo não derruba as outras — erro fica isolado na própria linha", () => {
    // Segunda linha tem data com mês inexistente (13) e valor vazio — inválida, mas
    // não uma linha totalmente em branco (essas já são descartadas por `parseCsv`).
    // Mapeamento fixado explicitamente aqui (em vez de `detectColumns`) porque o
    // propósito deste teste é o isolamento do erro por linha em `applyMapping`, não a
    // heurística de detecção — essa já tem cobertura dedicada em imports-detect-columns.
    const csvComLinhaRuim = [
      "Data;Descrição;Valor",
      "15/01/2026;Compra válida;-50,00",
      "31/13/2026;Descrição sem valor;",
    ].join("\n");
    const grid = parseCsv(csvComLinhaRuim);

    const mapped = applyMapping(grid, {
      mode: "signed",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      amountColumn: "Valor",
    });
    expect(mapped[0].error).toBeUndefined();
    expect(mapped[1].error).toBeDefined();
  });
});
