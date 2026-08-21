"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { ActionState } from "@/lib/action-state";

/** Switch genérico de ativar/desativar reutilizado por categorias, contas e cartões. */
export function EntityActiveToggle({
  id,
  active,
  action,
  activeLabel = "Desativar",
  inactiveLabel = "Ativar",
}: {
  id: string;
  active: boolean;
  action: (id: string, active: boolean) => Promise<ActionState>;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  const [checked, setChecked] = useState(active);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      onCheckedChange={(next) => {
        setChecked(next);
        startTransition(async () => {
          const result = await action(id, next);
          if (result?.error) {
            setChecked(!next);
            toast.error(result.error);
          }
        });
      }}
      aria-label={checked ? activeLabel : inactiveLabel}
    />
  );
}
