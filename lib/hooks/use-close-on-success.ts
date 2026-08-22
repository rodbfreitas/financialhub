import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action-state";

/**
 * Fecha um Dialog quando a Server Action associada retorna sucesso, e mostra a
 * mensagem de sucesso como toast (Design System §41 — "Transação adicionada", etc.).
 * Toda Server Action já retorna uma mensagem descritiva em `state.success`; antes da
 * Etapa 11 ela nunca era exibida em lugar nenhum, apesar do `<Toaster />` já estar
 * montado desde cedo.
 *
 * O fechamento do Dialog usa "ajuste de estado durante a renderização" (guia oficial
 * do React, "You Might Not Need an Effect") em vez de useEffect + setState, porque
 * esse padrão dispara o lint `react-hooks/set-state-in-effect`. Comparar contra o
 * próprio `state` e chamar setState condicionalmente durante o render é seguro: o
 * React interrompe a renderização em andamento e reinicia com o novo valor antes de
 * pintar a tela.
 *
 * Já o toast é um efeito colateral de verdade (chamada imperativa numa lib externa,
 * não uma atualização de estado do React) — colocá-lo no bloco acima correria o risco
 * de disparar durante uma renderização descartada (Strict Mode, renders interrompidos).
 * Por isso fica num `useEffect` normal, com `state` como dependência: o efeito só
 * roda de novo quando a Server Action realmente terminar com um novo resultado.
 */
export function useCloseOnSuccess(state: ActionState, setOpen: (open: boolean) => void) {
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) setOpen(false);
  }

  useEffect(() => {
    if (state?.success) toast.success(state.success);
  }, [state]);
}
