import { describe, expect, it } from "vitest";
import { PdfTextExtractionProvider } from "@/lib/documents/providers/pdf-text-extraction-provider";

/**
 * Monta um PDF mínimo válido (1 página, fonte Helvetica padrão, sem imagens) com
 * linhas de texto nas posições Y informadas. Usado só nestes testes — calcula o
 * `/Length` do content stream com `Buffer.byteLength` (nunca à mão) para não repetir
 * o bug de truncamento já visto na exploração manual desta macrofase.
 */
function buildMinimalPdf(lines: string[]): Buffer {
  const contentOps = lines
    .map((line, i) => {
      const y = 750 - i * 20;
      const escaped = line.replace(/([()\\])/g, "\\$1");
      return `BT /F1 12 Tf 50 ${y} Td (${escaped}) Tj ET`;
    })
    .join("\n");

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const contentBytes = Buffer.byteLength(contentOps, "utf-8");
  objects.push(`<< /Length ${contentBytes} >>\nstream\n${contentOps}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

/** `Buffer.buffer.slice()` tipa como `ArrayBuffer | SharedArrayBuffer` — força uma
 * cópia nova, sempre um `ArrayBuffer` de verdade, igual ao que `file.arrayBuffer()`
 * devolve em produção. */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return Uint8Array.from(buf).buffer as ArrayBuffer;
}

describe("PdfTextExtractionProvider", () => {
  it("extrai texto real de um PDF nativo (não digitalizado)", async () => {
    const pdf = buildMinimalPdf([
      "FATURA NUBANK",
      "15/03/2026 PADARIA SILVA 45,90",
      "16/03/2026 UBER TRIP 22,50",
    ]);
    const provider = new PdfTextExtractionProvider();
    const result = await provider.extract({
      buffer: toArrayBuffer(pdf),
      mimeType: "application/pdf",
      fileName: "teste.pdf",
    });

    expect(result.ok).toBe(true);
    expect(result.pages).toHaveLength(1);
    const text = result.pages[0].rawText;
    expect(text).toContain("FATURA NUBANK");
    expect(text).toContain("PADARIA SILVA");
    expect(text).toContain("UBER TRIP");
  }, 20000);

  it("reporta honestamente quando o PDF não tem texto extraível", async () => {
    const pdf = buildMinimalPdf([]);
    const provider = new PdfTextExtractionProvider();
    const result = await provider.extract({
      buffer: toArrayBuffer(pdf),
      mimeType: "application/pdf",
      fileName: "vazio.pdf",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_ocr_provider");
  }, 20000);
});
