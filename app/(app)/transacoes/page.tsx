import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Transações — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Receipt}
      title="Transações"
      description="A tabela de transações com filtros, busca e o formulário de nova transação."
      etapa="Etapa 6 — Financial Core"
    />
  );
}
