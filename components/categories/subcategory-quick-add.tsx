"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { createSubcategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SubcategoryQuickAdd({ categoryId }: { categoryId: string }) {
  const [state, formAction, pending] = useActionState(createSubcategory, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="categoryId" value={categoryId} />
      <Input
        name="name"
        placeholder="Nova subcategoria"
        className="h-7 text-xs"
        aria-invalid={!!state?.fieldErrors?.name}
      />
      <Button type="submit" size="icon" variant="ghost" className="size-7 shrink-0" disabled={pending}>
        <Plus className="size-3.5" />
      </Button>
    </form>
  );
}
