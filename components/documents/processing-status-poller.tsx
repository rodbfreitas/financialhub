"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * DOC-03 (UX 2.0) — nunca simula progresso ou porcentagem fake (Design System 2.0
 * proíbe "score/progresso como único indicador"). Este componente não mostra nada
 * na tela — só atualiza a página periodicamente pra refletir o status real assim
 * que o processamento assíncrono (Macrofase 3-4) terminar, sem o usuário precisar
 * apertar F5. Para de existir sozinho quando o status sai de "received"/
 * "processing" — a página deixa de renderizá-lo na resposta seguinte do servidor.
 */
export function ProcessingStatusPoller({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
