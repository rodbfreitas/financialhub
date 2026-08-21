import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { User } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Perfis — Financial Hub Familiar" };

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
      <ComingSoon icon={User} title="Perfis" description="Perfis financeiros individuais e o perfil compartilhado." etapa="Etapa 6 — Financial Core" />
    </div>
  );
}
