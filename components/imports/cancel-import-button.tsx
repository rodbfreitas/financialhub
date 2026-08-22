"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cancelImport } from "@/actions/imports";

export function CancelImportButton({ importId }: { importId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={pending}>
          Cancelar importação
        </Button>
      }
      title="Cancelar esta importação?"
      description="Nenhuma transação será criada. Os arquivos enviados continuam salvos, mas o lote fica marcado como cancelado."
      confirmLabel="Cancelar importação"
      onConfirm={() => {
        startTransition(async () => {
          const result = await cancelImport(importId);
          if (result?.error) toast.error(result.error);
          else {
            if (result?.success) toast.success(result.success);
            router.refresh();
          }
        });
      }}
    />
  );
}
