"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTransfer } from "@/actions/transfers";

export function DeleteTransferButton({ transferId }: { transferId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={pending}
      title="Excluir transferência"
      onClick={() => {
        if (!window.confirm("Excluir esta transferência? As duas pernas serão removidas.")) return;
        startTransition(async () => {
          const result = await deleteTransfer(transferId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
