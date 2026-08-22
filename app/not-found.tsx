import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página 404 (Prompt Mestre §46) — antes disto, uma URL inexistente caía na página
 * padrão em branco do Next.js. Fica fora do shell autenticado por padrão (rotas
 * `app/(app)/*` continuam protegidas pelo middleware antes de chegar aqui).
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Compass className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Voltar pra Visão Geral</Link>
      </Button>
    </div>
  );
}
