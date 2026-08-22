"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary do shell autenticado (Prompt Mestre §46, Design System §42: o erro
 * precisa explicar o que aconteceu, o impacto e como resolver — nunca um "Erro 500"
 * cru). Por convenção do Next.js, este arquivo captura erros de qualquer `page.tsx`
 * abaixo de `app/(app)/` SEM derrubar o `layout.tsx` da mesma pasta — a sidebar/topbar
 * continuam montadas e o usuário não perde a navegação. Não captura erros do próprio
 * `layout.tsx` (ex.: falha ao buscar o household) — esses sobem pro `app/error.tsx`.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Financial Hub] Erro na página:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-negative/10 text-negative">
        <AlertTriangle className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Não conseguimos carregar esta página</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Algo deu errado ao buscar seus dados. Nada foi alterado — tente novamente, ou volte pra Visão Geral se o
          problema continuar.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Voltar pra Visão Geral</Link>
        </Button>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}
