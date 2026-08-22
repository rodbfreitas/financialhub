import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Testes de RLS (Etapa 12 — QA, Prompt Mestre "RLS tests"). Rodam contra o projeto
 * Supabase REAL do household (não um projeto de teste separado — o app só tem um
 * projeto), usando `SUPABASE_SERVICE_ROLE_KEY` pra criar/limpar 2 households
 * sintéticos temporários e comprovar que as policies de RLS isolam um household do
 * outro. Por isso ficam num config/comando separado (`npm run test:rls`) e nunca
 * rodam como parte do `npm test`/CI padrão sem essa env var setada — os próprios
 * testes se pulam sozinhos (`describe.skipIf`) se a chave não estiver presente,
 * então rodar `npm test` num CI sem a service role key nunca falha por causa disso.
 *
 * NUNCA commitar a service role key. Pra rodar localmente:
 *   SUPABASE_SERVICE_ROLE_KEY="..." NEXT_PUBLIC_SUPABASE_URL="..." npm run test:rls
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
