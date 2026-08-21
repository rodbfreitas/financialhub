import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Visão Geral — Financial Hub Familiar" };

export default function DashboardPage() {
  return (
    <ComingSoon
      icon={LayoutDashboard}
      title="Visão Geral"
      description="O dashboard com receitas, despesas, saldo, orçamento e gráficos."
      etapa="Etapa 7 — Dashboard"
    />
  );
}
