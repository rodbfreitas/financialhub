import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Patrimônio — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Patrimônio"
      description="Ativos, passivos e evolução do patrimônio líquido."
      etapa="Etapa 8 — Planning"
    />
  );
}
