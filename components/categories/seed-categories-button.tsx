"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedDefaultCategories } from "@/actions/categories";

export function SeedCategoriesButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await seedDefaultCategories();
          if (result?.error) toast.error(result.error);
        })
      }
    >
      <Sparkles className="size-4" />
      {pending ? "Criando…" : "Usar categorias sugeridas"}
    </Button>
  );
}
