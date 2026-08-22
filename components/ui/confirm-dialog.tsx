"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Confirmação em modal pra ações destrutivas ou de consequência (Design System §43:
 * "Exclusões relevantes utilizarão modal", com exemplo "Excluir transação? Essa ação
 * removerá a transação dos seus relatórios. [Cancelar]"). Substitui os `window.confirm()`
 * espalhados pelo app até a Etapa 11 — um dialog nativo do navegador não segue a marca,
 * bloqueia a thread inteira, e falha em alguns contextos de automação/teste.
 *
 * Puramente apresentacional: quem chama continua dono do `useTransition`/toast — só
 * passa `onConfirm` (disparado quando o usuário confirma) no lugar do antigo
 * `if (!window.confirm(...)) return;` antes de rodar a Server Action.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Excluir",
  variant = "destructive",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(variant === "default" && buttonVariants({ variant: "default" }))}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
