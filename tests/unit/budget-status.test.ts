import { describe, expect, it } from "vitest";
import { budgetStatus } from "@/lib/budget-status";

describe("budgetStatus", () => {
  it("normal abaixo de 70%", () => {
    expect(budgetStatus(1000, 0)).toBe("normal");
    expect(budgetStatus(1000, 699)).toBe("normal");
  });

  it("atenção entre 70% e 89%", () => {
    expect(budgetStatus(1000, 700)).toBe("atencao");
    expect(budgetStatus(1000, 899)).toBe("atencao");
  });

  it("crítico entre 90% e 99%", () => {
    expect(budgetStatus(1000, 900)).toBe("critico");
    expect(budgetStatus(1000, 999)).toBe("critico");
  });

  it("excedido a partir de 100%", () => {
    expect(budgetStatus(1000, 1000)).toBe("excedido");
    expect(budgetStatus(1000, 1500)).toBe("excedido");
  });

  it("planejado zero ou negativo: excedido se houve qualquer gasto, senão normal", () => {
    expect(budgetStatus(0, 0)).toBe("normal");
    expect(budgetStatus(0, 1)).toBe("excedido");
    expect(budgetStatus(-100, 50)).toBe("excedido");
  });
});
