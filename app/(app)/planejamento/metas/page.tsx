import type { Metadata } from "next";
import { Target } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Metas — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Target}
      title="Metas"
      description="Metas financeiras com progresso e previsão de conclusão."
      etapa="Etapa 8 — Planning"
    />
  );
}
