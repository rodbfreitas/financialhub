"use client";

import { useActionState, useState } from "react";
import { Landmark } from "lucide-react";
import { setImportDestination } from "@/actions/imports";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";
import { importDestinationOptions } from "@/lib/validations/import";

const DESTINATION_LABELS: Record<(typeof importDestinationOptions)[number], string> = {
  account: "Conta",
  credit_card: "Cartão de crédito",
};

type AccountOption = { id: string; name: string };
type CreditCardOption = { id: string; name: string };

/**
 * Fase 2 — Macrofase 10: quando a materialização de um documento (Macrofase 9) não
 * conseguiu resolver conta/cartão automaticamente, a revisão em lote fica bloqueada
 * até o usuário escolher o destino manualmente — mesma pergunta que o upload de
 * arquivo já faz sempre, só que feita aqui porque documentos não passam por aquele
 * formulário.
 */
export function ImportDestinationForm({
  importId,
  accounts,
  creditCards,
}: {
  importId: string;
  accounts: AccountOption[];
  creditCards: CreditCardOption[];
}) {
  const [state, formAction, pending] = useActionState(setImportDestination, null);
  const [destination, setDestination] = useState<(typeof importDestinationOptions)[number]>(
    accounts.length > 0 ? "account" : "credit_card",
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [creditCardId, setCreditCardId] = useState(creditCards[0]?.id ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="size-4" /> Escolha o destino desta importação
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Não conseguimos identificar automaticamente a conta ou o cartão deste documento. Escolha o destino para
          liberar a revisão dos lançamentos.
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="importId" value={importId} />
          <input type="hidden" name="destination" value={destination} />
          <input type="hidden" name="accountId" value={destination === "account" ? accountId : ""} />
          <input type="hidden" name="creditCardId" value={destination === "credit_card" ? creditCardId : ""} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="destination-type">Destino</Label>
            <Select value={destination} onValueChange={(v) => setDestination(v as typeof destination)}>
              <SelectTrigger id="destination-type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {importDestinationOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {DESTINATION_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === "account" ? (
            <div>
              <Label htmlFor="destination-account">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="destination-account" className="mt-1.5 w-full">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormFieldError messages={state?.fieldErrors?.accountId} />
            </div>
          ) : null}

          {destination === "credit_card" ? (
            <div>
              <Label htmlFor="destination-card">Cartão</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger id="destination-card" className="mt-1.5 w-full">
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormFieldError messages={state?.fieldErrors?.creditCardId} />
            </div>
          ) : null}

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Salvando…" : "Confirmar destino"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
