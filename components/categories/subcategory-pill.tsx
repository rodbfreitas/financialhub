"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSubcategoryActive } from "@/actions/categories";

export function SubcategoryPill({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const [isActive, setIsActive] = useState(active);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !isActive;
          setIsActive(next);
          const result = await setSubcategoryActive(id, next);
          if (result?.error) {
            setIsActive(!next);
            toast.error(result.error);
          }
        })
      }
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
      style={{ opacity: isActive ? 1 : 0.4 }}
      title={isActive ? "Clique para desativar" : "Clique para reativar"}
    >
      {name}
    </button>
  );
}
