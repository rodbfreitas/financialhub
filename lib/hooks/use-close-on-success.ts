import { useState } from "react";
import type { ActionState } from "@/lib/action-state";

/**
 * Fecha um Dialog quando a Server Action associada retorna sucesso. Implementado como
 * "ajuste de estado durante a renderização" (guia oficial do React, "You Might Not
 * Need an Effect") em vez de useEffect + setState, porque esse padrão dispara o lint
 * `react-hooks/set-state-in-effect` (setState síncrono dentro de efeito causa
 * cascading renders). Comparar contra o próprio `state` e chamar setState
 * condicionalmente durante o render é seguro: o React interrompe a renderização em
 * andamento e reinicia com o novo valor antes de pintar a tela.
 */
export function useCloseOnSuccess(state: ActionState, setOpen: (open: boolean) => void) {
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) setOpen(false);
  }
}
