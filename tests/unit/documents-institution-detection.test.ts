import { describe, expect, it } from "vitest";
import { detectInstitution } from "@/lib/documents/institution-detection";

describe("detectInstitution", () => {
  it("reconhece instituições conhecidas dentro de um texto maior", () => {
    expect(detectInstitution("Fatura Nubank\nVencimento 10/03/2026")).toBe("Nubank");
    expect(detectInstitution("BANCO INTER S.A. - EXTRATO")).toBe("Banco Inter");
  });

  it("retorna null quando nenhuma instituição conhecida aparece", () => {
    expect(detectInstitution("Recibo qualquer sem nome de banco nenhum")).toBeNull();
  });

  it("não dá falso positivo por substring parcial", () => {
    // "Neon" não deveria casar em "Neonzinho Comércio Ltda", já que a busca usa \b.
    expect(detectInstitution("Neonzinho Comércio Ltda - Nota Fiscal")).toBeNull();
  });
});
