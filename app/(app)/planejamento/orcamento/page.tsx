import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Orçamento — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={PiggyBank}
      title="Orçamento"
      description="Orçamento mensal geral e por categoria."
      etapa="Etapa 8 — Planning"
    />
  );
}
