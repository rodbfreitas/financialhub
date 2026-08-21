"use client";

import { useTransition } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateRecurringTransaction } from "@/actions/recurring";

export function GenerateRecurringButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await generateRecurringTransaction(id);
          if (result?.error) {
            toast.error(result.error);
          } else if (result?.success) {
            toast.success(result.success);
          }
        })
      }
    >
      <Zap className="size-4" />
      {pending ? "Gerando…" : "Gerar agora"}
    </Button>
  );
}
