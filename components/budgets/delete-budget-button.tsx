"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteBudget } from "@/actions/budgets";

export function DeleteBudgetButton({ id, name }: { id: string; name: string }) {
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
          title="Excluir orçamento"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Excluir orçamento?"
      description={`"${name}" e todos os limites por categoria dele serão removidos. Essa ação não pode ser desfeita.`}
      onConfirm={() => {
        startTransition(async () => {
          const result = await deleteBudget(id);
          if (result?.error) toast.error(result.error);
          else toast.success(`Orçamento "${name}" excluído.`);
        });
      }}
    />
  );
}
