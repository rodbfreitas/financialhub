"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTransfer } from "@/actions/transfers";

export function DeleteTransferButton({ transferId }: { transferId: string }) {
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
          title="Excluir transferência"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Excluir transferência?"
      description="As duas pernas dessa transferência serão removidas dos saldos das contas. Essa ação não pode ser desfeita."
      onConfirm={() => {
        startTransition(async () => {
          const result = await deleteTransfer(transferId);
          if (result?.error) toast.error(result.error);
          else toast.success("Transferência excluída.");
        });
      }}
    />
  );
}
