import { describe, expect, it } from "vitest";
import { parseOfx } from "@/lib/imports/ofx";

const SAMPLE_OFX = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260115000000
<TRNAMT>-89.90
<FITID>2026011500001
<NAME>SUPERMERCADO ABC
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260116000000
<TRNAMT>1500.00
<FITID>2026011600002
<MEMO>SALARIO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

describe("parseOfx", () => {
  it("extrai as transações de dentro dos blocos STMTTRN", () => {
    const rows = parseOfx(SAMPLE_OFX);
    expect(rows).toHaveLength(2);
  });

  it("FITID vira externalId (prioridade #1 de deduplicação)", () => {
    const rows = parseOfx(SAMPLE_OFX);
    expect(rows[0].externalId).toBe("2026011500001");
    expect(rows[1].externalId).toBe("2026011600002");
  });

  it("data e valor são parseados corretamente, sinal preservado", () => {
    const rows = parseOfx(SAMPLE_OFX);
    expect(rows[0].parsedDate).toBe("2026-01-15");
    expect(rows[0].parsedAmount).toBe(-89.9);
    expect(rows[1].parsedDate).toBe("2026-01-16");
    expect(rows[1].parsedAmount).toBe(1500);
  });

  it("usa NAME, com fallback pra MEMO quando NAME está ausente", () => {
    const rows = parseOfx(SAMPLE_OFX);
    expect(rows[0].parsedDescription).toBe("SUPERMERCADO ABC");
    expect(rows[1].parsedDescription).toBe("SALARIO");
  });

  it("marca erro quando falta data, descrição ou valor", () => {
    const broken = `<STMTTRN>\n<DTPOSTED>\n<TRNAMT>0\n</STMTTRN>`;
    const rows = parseOfx(broken);
    expect(rows[0].error).toBeDefined();
    expect(rows[0].error).toContain("valor inválido");
  });

  it("sem nenhum bloco STMTTRN, devolve array vazio", () => {
    expect(parseOfx("<OFX></OFX>")).toEqual([]);
  });
});
