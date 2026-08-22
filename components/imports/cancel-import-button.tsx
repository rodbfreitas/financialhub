"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelImport } from "@/actions/imports";

export function CancelImportButton({ importId }: { importId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Cancelar esta importação?")) return;
        startTransition(async () => {
          const result = await cancelImport(importId);
          if (result?.error) toast.error(result.error);
          else {
            if (result?.success) toast.success(result.success);
            router.refresh();
          }
        });
      }}
    >
      Cancelar importação
    </Button>
  );
}
