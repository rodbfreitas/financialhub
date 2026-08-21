"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  if (state?.success) {
    return <FormAlert variant="success">{state.success}</FormAlert>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className="mt-1.5"
          aria-invalid={!!state?.fieldErrors?.email}
          autoFocus
        />
        <FormFieldError messages={state?.fieldErrors?.email} />
      </div>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Enviando…" : "Enviar link de redefinição"}
      </Button>
    </form>
  );
}
