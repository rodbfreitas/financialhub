import type { Metadata } from "next";
import { FileBarChart } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Relatórios — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={FileBarChart}
      title="Relatórios"
      description="Fluxo de caixa, gastos por categoria/pessoa e outros relatórios."
      etapa="Etapa 10 — Reports"
    />
  );
}
