import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Assinaturas — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Repeat}
      title="Assinaturas"
      description="Central de assinaturas com custo mensal e anual projetado."
      etapa="Etapa 6 — Financial Core"
    />
  );
}
