import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Cartões — Financial Hub Familiar" };

export default function Page() {
  return (
    <ComingSoon
      icon={CreditCard}
      title="Cartões"
      description="Cartões de crédito, faturas e parcelamentos."
      etapa="Etapa 6 — Financial Core"
    />
  );
}
