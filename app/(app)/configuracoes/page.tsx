import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { SETTINGS_SECTIONS } from "@/components/shell/nav-data";

export const metadata: Metadata = { title: "Configurações — Financial Hub Familiar" };

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conta, segurança, household e preferências do sistema.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <div>
              <p className="text-sm font-medium text-foreground">{section.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
            </div>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
