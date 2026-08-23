import { describe, expect, it } from "vitest";
import { sha256OfBuffer } from "@/lib/documents/hash";

describe("sha256OfBuffer", () => {
  it("é determinístico para o mesmo conteúdo", () => {
    const a = new TextEncoder().encode("fatura de agosto").buffer;
    const b = new TextEncoder().encode("fatura de agosto").buffer;
    expect(sha256OfBuffer(a)).toBe(sha256OfBuffer(b));
  });

  it("produz hashes diferentes para conteúdos diferentes", () => {
    const a = new TextEncoder().encode("documento 1").buffer;
    const b = new TextEncoder().encode("documento 2").buffer;
    expect(sha256OfBuffer(a)).not.toBe(sha256OfBuffer(b));
  });

  it("retorna hex de 64 caracteres (SHA-256)", () => {
    const hash = sha256OfBuffer(new TextEncoder().encode("x").buffer);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
