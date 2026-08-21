import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { Lock } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Dados e privacidade — Financial Hub Familiar" };

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
      <ComingSoon icon={Lock} title="Dados e privacidade" description="Exportação e exclusão de dados, conforme a LGPD." etapa="Etapa 11 — Polish" />
    </div>
  );
}
