"use client";

import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";

type InvitePreview = {
  householdName: string;
  email: string;
};

export function SignupForm({ invite }: { invite?: InvitePreview & { token: string } }) {
  const [state, action, pending] = useActionState(signUp, null);

  if (state?.success) {
    return <FormAlert variant="success">{state.success}</FormAlert>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={invite ? "invite" : "new_household"} />
      {invite ? <input type="hidden" name="token" value={invite.token} /> : null}

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      {invite ? (
        <div className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Você foi convidado para o household <strong>{invite.householdName}</strong>.
        </div>
      ) : null}

      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          className="mt-1.5"
          aria-invalid={!!state?.fieldErrors?.name}
        />
        <FormFieldError messages={state?.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={invite?.email}
          className="mt-1.5 disabled:opacity-100"
          disabled={!!invite}
          aria-invalid={!!state?.fieldErrors?.email}
        />
        {invite ? (
          <input type="hidden" name="email" value={invite.email} />
        ) : null}
        <FormFieldError messages={state?.fieldErrors?.email} />
      </div>

      {!invite ? (
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
      ) : null}

      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-1.5"
          aria-invalid={!!state?.fieldErrors?.password}
        />
        <FormFieldError messages={state?.fieldErrors?.password} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Pelo menos 8 caracteres, com letras e números.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
