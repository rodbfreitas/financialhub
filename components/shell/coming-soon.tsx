import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

/**
 * Placeholder honesto para rotas do menu que já existem na navegação mas ainda não
 * têm a tela implementada — nunca mostra dado fictício, só avisa quando chega.
 */
export function ComingSoon({
  title,
  description,
  etapa,
  icon: Icon = Construction,
}: {
  title: string;
  description?: string;
  etapa: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ?? "Esta tela ainda não foi construída."} Chega em {etapa}.
      </p>
    </div>
  );
}
