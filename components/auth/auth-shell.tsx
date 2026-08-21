import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Moldura visual compartilhada por todas as telas de autenticação — mesma linguagem
 * da landing (Design System §1: "Confiança. Clareza. Controle. Sofisticação.").
 */
export function AuthShell({
  eyebrow = "Private Financial Intelligence",
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Financial Hub
          </Link>
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {eyebrow}
          </span>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-none" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="mb-5 flex flex-col gap-1.5 text-center">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
