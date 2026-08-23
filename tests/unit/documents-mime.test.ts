import { describe, expect, it } from "vitest";
import {
  documentExtensionOf,
  isAcceptedDocumentFile,
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_FILE_BYTES,
} from "@/lib/documents/mime";

describe("documentExtensionOf", () => {
  it("extrai a extensão em minúsculas, com ponto", () => {
    expect(documentExtensionOf("Fatura-Agosto.PDF")).toBe(".pdf");
    expect(documentExtensionOf("comprovante.jpeg")).toBe(".jpeg");
  });

  it("retorna string vazia quando não há extensão", () => {
    expect(documentExtensionOf("arquivo-sem-extensao")).toBe("");
  });
});

describe("isAcceptedDocumentFile", () => {
  it("aceita PDF/JPG/PNG pelo mime type", () => {
    expect(isAcceptedDocumentFile({ name: "fatura.pdf", type: "application/pdf" })).toBe(true);
    expect(isAcceptedDocumentFile({ name: "boleto.png", type: "image/png" })).toBe(true);
    expect(isAcceptedDocumentFile({ name: "comprovante.jpg", type: "image/jpeg" })).toBe(true);
  });

  it("aceita pela extensão quando o navegador não preenche o mime type", () => {
    expect(isAcceptedDocumentFile({ name: "extrato.pdf", type: "" })).toBe(true);
  });

  it("rejeita formatos fora da whitelist (CSV/XLSX são de outro fluxo)", () => {
    expect(isAcceptedDocumentFile({ name: "extrato.csv", type: "text/csv" })).toBe(false);
    expect(isAcceptedDocumentFile({ name: "malicioso.exe", type: "application/octet-stream" })).toBe(false);
  });

  it("rejeita quando a extensão bate mas o mime type informado não é o esperado", () => {
    expect(isAcceptedDocumentFile({ name: "fatura.pdf", type: "text/html" })).toBe(false);
  });

  it("expõe as constantes usadas pelo input file da UI", () => {
    expect(ACCEPTED_DOCUMENT_EXTENSIONS).toEqual([".pdf", ".jpg", ".jpeg", ".png"]);
    expect(MAX_DOCUMENT_FILE_BYTES).toBe(10 * 1024 * 1024);
  });
});
