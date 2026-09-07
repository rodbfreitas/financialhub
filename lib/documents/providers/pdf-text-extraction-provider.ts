import type {
  DocumentExtractionProvider,
  ExtractionResult,
  ExtractedPage,
  ExtractedLine,
} from "./extraction-provider";

/** Tolerância vertical (unidades do PDF) para considerar dois itens de texto na mesma linha. */
const Y_TOLERANCE = 2;
/** Abaixo disso, consideramos que o PDF não tem texto extraível de verdade (provavelmente
 * digitalizado como imagem) — melhor reportar honestamente do que devolver "quase nada". */
const MIN_TOTAL_CHARS = 20;

type PdfTextItem = { str: string; transform: number[]; hasEOL?: boolean };

/**
 * Extrator determinístico de texto nativo de PDF via `pdfjs-serverless` (redistribuição
 * do PDF.js empacotada especificamente para runtimes serverless/edge — Macrofase 13,
 * Prompt Mestre §22 "correção de bug encontrado em validação real"), sem Worker e sem
 * canvas — só a camada de texto (`getTextContent`), adequada para runtime serverless
 * (Vercel). Não faz OCR: PDFs só-imagem (sem texto embutido) são reportados como tal,
 * nunca têm conteúdo inventado.
 *
 * Historico: a versão anterior usava `pdfjs-dist/legacy/build/pdf.mjs` diretamente,
 * apontando `standardFontDataUrl` para `node_modules/pdfjs-dist/standard_fonts` no
 * filesystem. Isso funcionava em todo teste local (Vitest roda em Node.js puro, com
 * acesso direto ao `node_modules` do disco), mas falhava 100% das vezes em produção na
 * Vercel com `DOMMatrix is not defined`: o Next.js não rastreia esses arquivos de fonte
 * (não são importados por nenhum módulo JS, só lidos em runtime) para dentro do bundle
 * da serverless function, então em produção `standardFontDataUrl` aponta pra um caminho
 * que não existe — o pdf.js então cai num caminho interno de estimativa de métricas de
 * fonte que depende de `DOMMatrix`, indisponível em Node.js puro. `pdfjs-serverless`
 * evita essa classe inteira de problema: não depende de arquivo de fonte externo
 * (`useSystemFonts: true`), não precisa de worker separado (já embutido no bundle) e é
 * corrigido especificamente para rodar sem nenhuma API de navegador. Achado e corrigido
 * durante a validação manual em produção da Macrofase 13 (upload de um comprovante de
 * teste realmente falhou com esse erro antes da correção).
 */
export class PdfTextExtractionProvider implements DocumentExtractionProvider {
  readonly name = "pdfjs-text";

  supports(mimeType: string): boolean {
    return mimeType === "application/pdf";
  }

  async extract(input: { buffer: ArrayBuffer; mimeType: string; fileName: string }): Promise<ExtractionResult> {
    const { getDocument } = await import("pdfjs-serverless");

    const loadingTask = getDocument({
      data: new Uint8Array(input.buffer),
      useSystemFonts: true,
    });

    let doc: Awaited<typeof loadingTask.promise>;
    try {
      doc = await loadingTask.promise;
    } catch (err) {
      return {
        ok: false,
        confidence: 0,
        pages: [],
        reason: "unreadable_content",
        note: `Falha ao abrir o PDF: ${err instanceof Error ? err.message : String(err)}`,
        providerName: this.name,
      };
    }

    const pages: ExtractedPage[] = [];
    let totalChars = 0;

    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();

        const lines = groupItemsIntoLines(textContent.items as PdfTextItem[], pageNumber);
        const rawText = lines.map((l) => l.text).join("\n");
        totalChars += rawText.length;

        pages.push({
          pageNumber,
          width: viewport.width,
          height: viewport.height,
          rawText,
          lines,
        });

        page.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }

    if (totalChars < MIN_TOTAL_CHARS) {
      return {
        ok: false,
        confidence: 0,
        pages,
        reason: "no_ocr_provider",
        note:
          "PDF sem (ou com pouquíssimo) texto extraível — provavelmente digitalizado como imagem. Nenhum provider de OCR está configurado neste ambiente.",
        providerName: this.name,
      };
    }

    return {
      ok: true,
      confidence: 0.75,
      pages,
      providerName: this.name,
      providerModel: "pdfjs-serverless-text-layer",
    };
  }
}

function groupItemsIntoLines(items: PdfTextItem[], pageNumber: number): ExtractedLine[] {
  const textItems = items.filter((i) => typeof i.str === "string");

  const lines: ExtractedLine[] = [];
  let currentText = "";
  let currentY: number | null = null;

  const flush = () => {
    if (currentText.trim()) {
      lines.push({ pageNumber, text: currentText.trim(), y: currentY ?? undefined });
    }
    currentText = "";
  };

  for (const item of textItems) {
    const y = item.transform[5];
    if (currentY !== null && Math.abs(y - currentY) > Y_TOLERANCE) {
      flush();
    }
    currentText += item.str;
    currentY = y;

    if (item.hasEOL) {
      flush();
      currentY = null;
    }
  }
  flush();

  return lines;
}
