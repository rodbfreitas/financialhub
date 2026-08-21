"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setProfileActive } from "@/actions/profiles";

export function ProfileActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [checked, setChecked] = useState(active);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      onCheckedChange={(next) => {
        setChecked(next);
        startTransition(async () => {
          const result = await setProfileActive(id, next);
          if (result?.error) {
            setChecked(!next);
            toast.error(result.error);
          }
        });
      }}
      aria-label={checked ? "Desativar perfil" : "Ativar perfil"}
    />
  );
}
