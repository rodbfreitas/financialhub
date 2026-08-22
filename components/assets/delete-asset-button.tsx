"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAsset } from "@/actions/assets";

export function DeleteAssetButton({ id, name }: { id: string; name: string }) {
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
          title="Excluir ativo"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Excluir ativo?"
      description={`"${name}" será removido e deixa de contar no seu patrimônio. Essa ação não pode ser desfeita.`}
      onConfirm={() => {
        startTransition(async () => {
          const result = await deleteAsset(id);
          if (result?.error) toast.error(result.error);
          else toast.success(`Ativo "${name}" excluído.`);
        });
      }}
    />
  );
}
