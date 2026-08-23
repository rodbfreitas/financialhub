import { createHash } from "node:crypto";

/**
 * SHA-256 do conteúdo bruto do arquivo — base da idempotência por documento
 * (ERD 2.0: "computar SHA-256"; PRD 2.0 / UX "Mesmo documento reenviado"). Nunca
 * usar apenas o nome do arquivo como identidade (ERD: "nunca confiar só no filename").
 */
export function sha256OfBuffer(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}
