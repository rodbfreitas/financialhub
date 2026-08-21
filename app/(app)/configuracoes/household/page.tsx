import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Household — Financial Hub Familiar" };

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
      <ComingSoon icon={Users} title="Household" description="Nome da família e gerenciamento de membros e convites." etapa="Etapa 6 — Financial Core" />
    </div>
  );
}
