"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/actions/transactions";

export function DeleteTransactionButton({ id, description }: { id: string; description: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={pending}
      title="Excluir transação"
      onClick={() => {
        if (!window.confirm(`Excluir a transação "${description}"? Essa ação não pode ser desfeita.`)) {
          return;
        }
        startTransition(async () => {
          const result = await deleteTransaction(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
