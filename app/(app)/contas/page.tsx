import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Contas — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Landmark}
      title="Contas"
      description="Cadastro de contas bancárias, carteiras e saldo."
      etapa="Etapa 6 — Financial Core"
    />
  );
}
