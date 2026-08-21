"use client";

import { useActionState } from "react";
import { createHouseholdAction } from "@/actions/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";

export function CreateHouseholdForm() {
  const [state, action, pending] = useActionState(createHouseholdAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <div>
        <Label htmlFor="householdName">Nome do household</Label>
        <Input
          id="householdName"
          name="householdName"
          placeholder="Ex.: Família Rodrigo & Lenise"
          className="mt-1.5"
          aria-invalid={!!state?.fieldErrors?.householdName}
        />
        <FormFieldError messages={state?.fieldErrors?.householdName} />
      </div>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Criando…" : "Criar household"}
      </Button>
    </form>
  );
}
