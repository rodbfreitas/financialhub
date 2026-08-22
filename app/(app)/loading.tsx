import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading UI compartilhado (Next.js App Router) pra toda navegação dentro do shell
 * autenticado — Prompt Mestre §46 (ESTADOS: loading) e Design System §40 (skeletons,
 * nunca um spinner central como solução padrão). Como este arquivo vive em
 * `app/(app)/`, o React envolve automaticamente QUALQUER `page.tsx` abaixo dele (todas
 * as ~20 rotas do app) numa Suspense boundary — a sidebar/topbar do `layout.tsx`
 * continuam montadas e interativas, só o conteúdo da página é trocado por isto
 * enquanto os dados carregam. Genérico de propósito (não é por página): cobre o caso
 * comum de "card de resumo + gráfico + lista", que é a forma da maioria das telas.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      <Skeleton className="h-64 w-full" />

      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
