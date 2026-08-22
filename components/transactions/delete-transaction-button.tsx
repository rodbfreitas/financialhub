"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTransaction } from "@/actions/transactions";

export function DeleteTransactionButton({ id, description }: { id: string; description: string }) {
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
          title="Excluir transação"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Excluir transação?"
      description={`"${description}" será removida dos seus relatórios e do saldo da conta ou fatura. Essa ação não pode ser desfeita.`}
      onConfirm={() => {
        startTransition(async () => {
          const result = await deleteTransaction(id);
          if (result?.error) toast.error(result.error);
          else toast.success(`Transação "${description}" excluída.`);
        });
      }}
    />
  );
}
