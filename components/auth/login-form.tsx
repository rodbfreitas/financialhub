"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithPassword, verifyMfaChallenge } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";

export function LoginForm({ next = "/onboarding" }: { next?: string }) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    null,
  );
  const [mfaState, mfaAction, mfaPending] = useActionState(verifyMfaChallenge, null);

  const mfa = mfaState?.mfa ?? passwordState?.mfa;

  if (mfa) {
    return (
      <form action={mfaAction} className="flex flex-col gap-4">
        <input type="hidden" name="factorId" value={mfa.factorId} />
        <input type="hidden" name="next" value={next} />

        {mfaState?.error ? <FormAlert>{mfaState.error}</FormAlert> : null}

        <p className="text-sm text-muted-foreground">
          Sua conta tem verificação em duas etapas ativada. Abra seu aplicativo
          autenticador e informe o código de 6 dígitos.
        </p>

        <div>
          <Label htmlFor="code">Código de verificação</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="mt-1.5 text-center text-lg tracking-[0.5em]"
            autoFocus
            aria-invalid={!!mfaState?.fieldErrors?.code}
          />
          <FormFieldError messages={mfaState?.fieldErrors?.code} />
        </div>

        <Button type="submit" disabled={mfaPending} className="mt-1">
          {mfaPending ? "Verificando…" : "Verificar e entrar"}
        </Button>
      </form>
    );
  }

  return (
    <form action={passwordAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {passwordState?.error ? <FormAlert>{passwordState.error}</FormAlert> : null}

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className="mt-1.5"
          aria-invalid={!!passwordState?.fieldErrors?.email}
        />
        <FormFieldError messages={passwordState?.fieldErrors?.email} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1.5"
          aria-invalid={!!passwordState?.fieldErrors?.password}
        />
        <FormFieldError messages={passwordState?.fieldErrors?.password} />
      </div>

      <Button type="submit" disabled={passwordPending} className="mt-1">
        {passwordPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
