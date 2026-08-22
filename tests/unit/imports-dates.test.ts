import { describe, expect, it } from "vitest";
import { parseFlexibleDate, parseOfxDate } from "@/lib/imports/dates";

describe("parseFlexibleDate", () => {
  it("aceita aaaa-mm-dd (formato já normalizado, ex.: vindo do XLSX)", () => {
    expect(parseFlexibleDate("2026-01-15")).toBe("2026-01-15");
  });

  it("aceita dd/mm/aaaa (padrão de extrato brasileiro)", () => {
    expect(parseFlexibleDate("15/01/2026")).toBe("2026-01-15");
  });

  it("aceita dd-mm-aaaa", () => {
    expect(parseFlexibleDate("15-01-2026")).toBe("2026-01-15");
  });

  it("aceita dd/mm/aa, assumindo 20xx", () => {
    expect(parseFlexibleDate("15/01/26")).toBe("2026-01-15");
  });

  it("nunca interpreta mm/dd como no runtime nativo do Date — dd/mm sempre primeiro", () => {
    // 13/02/2026 só faz sentido como dia=13, mês=02 (não existe mês 13)
    expect(parseFlexibleDate("13/02/2026")).toBe("2026-02-13");
  });

  it("rejeita data inexistente (dia/mês que não existe no calendário)", () => {
    expect(parseFlexibleDate("31/02/2026")).toBeNull(); // fevereiro não tem dia 31
    expect(parseFlexibleDate("32/01/2026")).toBeNull();
    expect(parseFlexibleDate("15/13/2026")).toBeNull(); // mês 13 não existe
  });

  it("rejeita texto vazio ou formato não reconhecido", () => {
    expect(parseFlexibleDate("")).toBeNull();
    expect(parseFlexibleDate("não é uma data")).toBeNull();
  });
});

describe("parseOfxDate", () => {
  it("extrai aaaammdd do formato OFX (aaaammddhhmmss)", () => {
    expect(parseOfxDate("20260115000000")).toBe("2026-01-15");
  });

  it("aceita variantes com milissegundos/timezone (só a parte da data importa)", () => {
    expect(parseOfxDate("20260115120000.000[-3:BRT]")).toBe("2026-01-15");
  });

  it("rejeita mês/dia inválido ou texto não reconhecido", () => {
    expect(parseOfxDate("20261301000000")).toBeNull(); // mês 13
    expect(parseOfxDate("abc")).toBeNull();
  });
});
