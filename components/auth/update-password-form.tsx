"use client";

import { useActionState } from "react";
import { updatePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-1.5"
          aria-invalid={!!state?.fieldErrors?.password}
          autoFocus
        />
        <FormFieldError messages={state?.fieldErrors?.password} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Pelo menos 8 caracteres, com letras e números.
        </p>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="mt-1.5"
          aria-invalid={!!state?.fieldErrors?.confirmPassword}
        />
        <FormFieldError messages={state?.fieldErrors?.confirmPassword} />
      </div>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
