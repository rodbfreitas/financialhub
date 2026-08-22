"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary de topo (Prompt Mestre §46) — cobre erros fora do shell autenticado
 * (`/login`, `/signup`, `/onboarding`, `/auth/*`) e falhas no próprio
 * `app/(app)/layout.tsx` (ex.: erro ao buscar o household), que `app/(app)/error.tsx`
 * não captura por estar aninhado dentro dele. Continua dentro do `app/layout.tsx`
 * (fontes, tema, Toaster), só não tem a sidebar porque o layout que a monta é
 * exatamente o que pode ter falhado.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Financial Hub] Erro:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-negative/10 text-negative">
        <AlertTriangle className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Não conseguimos carregar esta página. Nada foi alterado — tente novamente, ou volte pro login.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/login">Ir para o login</Link>
        </Button>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}
