import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { MfaSection } from "@/components/account/mfa-section";

export const metadata: Metadata = { title: "Segurança da conta — Financial Hub Familiar" };

export default function SegurancaPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Configurações
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          Segurança da conta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie como você entra na sua conta.
        </p>
      </div>

      <div className="max-w-md">
        <MfaSection />
      </div>
    </div>
  );
}
