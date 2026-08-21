import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Importar dados — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={Upload}
      title="Importar dados"
      description="Importação de extratos e faturas em Excel, CSV, OFX ou PDF, com revisão antes de confirmar."
      etapa="Etapa 9 — Imports"
    />
  );
}
