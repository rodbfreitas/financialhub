import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Testes unitários e de integração (Etapa 12 — QA, Prompt Mestre "unit tests" +
 * "integration tests"). Roda contra código puro/mocado, nunca contra o projeto
 * Supabase real — os testes de RLS (que precisam do projeto real) ficam num config
 * separado (`vitest.rls.config.ts`) e não entram no `npm test` padrão.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/rls/**", "node_modules/**"],
  },
});
