"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteGoal } from "@/actions/goals";

export function DeleteGoalButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={pending}
      title="Excluir meta"
      onClick={() => {
        if (!window.confirm(`Excluir a meta "${name}"? Essa ação não pode ser desfeita.`)) {
          return;
        }
        startTransition(async () => {
          const result = await deleteGoal(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
