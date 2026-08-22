"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteLiability } from "@/actions/liabilities";

export function DeleteLiabilityButton({ id, name }: { id: string; name: string }) {
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
          title="Excluir passivo"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Excluir passivo?"
      description={`"${name}" será removido e deixa de contar no seu patrimônio. Essa ação não pode ser desfeita.`}
      onConfirm={() => {
        startTransition(async () => {
          const result = await deleteLiability(id);
          if (result?.error) toast.error(result.error);
          else toast.success(`Passivo "${name}" excluído.`);
        });
      }}
    />
  );
}
