"use client";

import { useEffect, useState, useTransition } from "react";
import type { Factor } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-field-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Enrollment + gerenciamento de MFA (TOTP) — Prompt Mestre §32. Fica em client
 * component porque o fluxo é interativo em várias etapas (gerar QR, verificar código,
 * remover fator) e a lib do Supabase já expõe tudo isso pro browser com a sessão do
 * usuário; não há motivo pra empacotar em Server Actions com round-trips de página.
 *
 * Importante: o login (actions/auth.ts) só desafia por MFA fatores com status
 * "verified" — um enroll() abandonado no meio (QR gerado, código nunca confirmado)
 * fica "unverified" e nunca bloqueia o login, mas também fica órfão no Supabase até
 * ser removido; por isso "Cancelar" chama unenroll() em vez de só limpar o estado local.
 */
export function MfaSection() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function refreshFactors() {
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError("Não foi possível carregar seus fatores de autenticação.");
      return;
    }
    setFactors(data.totp);
  }

  useEffect(() => {
    // Carga inicial da lista de fatores ao montar — o setState acontece depois do
    // await dentro de refreshFactors(), não sincronamente no corpo do efeito; é o
    // padrão usual de "fetch on mount" e não gera o cascading render que a regra
    // tenta prevenir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartEnroll() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Financial Hub — ${new Date().toLocaleDateString("pt-BR")}`,
      });

      if (enrollError || !data) {
        setError("Não foi possível iniciar a ativação do MFA. Tente novamente.");
        return;
      }

      setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    });
  }

  function handleCancelEnroll() {
    if (!enrolling) return;
    const factorId = enrolling.factorId;
    setEnrolling(null);
    setCode("");
    setError(null);
    startTransition(async () => {
      await supabase.auth.mfa.unenroll({ factorId });
      await refreshFactors();
    });
  }

  function handleVerify() {
    if (!enrolling) return;
    setError(null);
    startTransition(async () => {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrolling.factorId,
        code: code.trim(),
      });

      if (verifyError) {
        setError("Código inválido ou expirado. Confira o app autenticador e tente de novo.");
        return;
      }

      setEnrolling(null);
      setCode("");
      setSuccess("Verificação em duas etapas ativada com sucesso.");
      await refreshFactors();
    });
  }

  function handleRemove(factorId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });

      if (unenrollError) {
        setError("Não foi possível remover este fator. Tente novamente.");
        return;
      }

      setSuccess("Verificação em duas etapas desativada.");
      await refreshFactors();
    });
  }

  const verifiedFactors = factors?.filter((f) => f.status === "verified") ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificação em duas etapas (TOTP)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}
        {success ? <FormAlert variant="success">{success}</FormAlert> : null}

        {verifiedFactors === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : enrolling ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR code com seu app autenticador (Google Authenticator, 1Password,
              Authy…) e digite o código de 6 dígitos gerado.
            </p>
            <div
              className="mx-auto w-40 [&_svg]:h-auto [&_svg]:w-full"
              // SVG confiável, gerado pela própria API do Supabase Auth (não é input do usuário).
              dangerouslySetInnerHTML={{ __html: enrolling.qrCode }}
            />
            <p className="text-center text-xs text-muted-foreground">
              Não consegue escanear? Digite manualmente:{" "}
              <code className="font-mono">{enrolling.secret}</code>
            </p>
            <div>
              <Label htmlFor="mfa-code">Código de verificação</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="mt-1.5"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={handleCancelEnroll}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={pending || code.trim().length !== 6}
                onClick={handleVerify}
              >
                {pending ? "Verificando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        ) : verifiedFactors.length > 0 ? (
          <div className="flex flex-col gap-3">
            {verifiedFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {factor.friendly_name ?? "Autenticador"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ativado em {new Date(factor.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRemove(factor.id)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sua conta ainda não tem verificação em duas etapas. Ative para exigir um código
              adicional do seu app autenticador a cada login.
            </p>
            <Button type="button" disabled={pending} onClick={handleStartEnroll} className="self-start">
              Ativar verificação em duas etapas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
