import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { SlidersHorizontal } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Preferências — Financial Hub Familiar" };

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="p-6 pb-0">
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Configurações
        </Link>
      </div>
      <ComingSoon icon={SlidersHorizontal} title="Preferências" description="Idioma, moeda e formato de exibição." etapa="Etapa 11 — Polish" />
    </div>
  );
}
