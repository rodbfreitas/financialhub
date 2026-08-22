"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteGoal } from "@/actions/goals";

export function DeleteGoalButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          disabled={pending}
          title="Excluir meta"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Excluir meta?"
      description={`"${name}" e o progresso registrado serão removidos. Essa ação não pode ser desfeita.`}
      onConfirm={() => {
        startTransition(async () => {
          const result = await deleteGoal(id);
          if (result?.error) toast.error(result.error);
          else toast.success(`Meta "${name}" excluída.`);
        });
      }}
    />
  );
}
