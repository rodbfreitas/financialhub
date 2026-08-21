import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Integrações — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Plug}
      title="Integrações"
      description="Conexão com bancos via Open Finance."
      etapa="uma fase futura (Open Finance)"
    />
  );
}
