"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createAccount, updateAccount } from "@/actions/accounts";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";
import { accountTypeOptions, currencyOptions } from "@/lib/validations/account";

const TYPE_LABELS: Record<(typeof accountTypeOptions)[number], string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  digital: "Conta digital",
  investment: "Investimento",
  other: "Outros",
};

type Account = {
  id: string;
  name: string;
  institutionName: string | null;
  type: (typeof accountTypeOptions)[number];
  profileId: string;
  currency: (typeof currencyOptions)[number];
  currentBalance: number;
};

type ProfileOption = { id: string; name: string };

export function AccountFormDialog({
  account,
  profiles,
}: {
  account?: Account;
  profiles: ProfileOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = account ? updateAccount : createAccount;
  const [state, formAction, pending] = useActionState(action, null);
  const [type, setType] = useState<(typeof accountTypeOptions)[number]>(
    account?.type ?? "checking",
  );
  const [profileId, setProfileId] = useState(account?.profileId ?? profiles[0]?.id ?? "");
  const [currency, setCurrency] = useState<(typeof currencyOptions)[number]>(
    account?.currency ?? "BRL",
  );

  useCloseOnSuccess(state, setOpen);

  const noProfiles = profiles.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {account ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5" disabled={noProfiles}>
            <Plus className="size-4" />
            Nova conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Editar conta" : "Nova conta"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {account ? <input type="hidden" name="id" value={account.id} /> : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="currency" value={currency} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
          {noProfiles ? (
            <FormAlert>Crie um perfil antes de cadastrar uma conta.</FormAlert>
          ) : null}

          <div>
            <Label htmlFor="acc-name">Nome</Label>
            <Input
              id="acc-name"
              name="name"
              defaultValue={account?.name}
              placeholder="Ex.: Conta corrente Itaú"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="acc-institution">Instituição</Label>
            <Input
              id="acc-institution"
              name="institutionName"
              defaultValue={account?.institutionName ?? undefined}
              placeholder="Ex.: Itaú"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.institutionName}
            />
            <FormFieldError messages={state?.fieldErrors?.institutionName} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="acc-type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="acc-type" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {TYPE_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="acc-currency">Moeda</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as typeof currency)}
              >
                <SelectTrigger id="acc-currency" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="acc-profile">Titular</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger id="acc-profile" className="mt-1.5 w-full">
                <SelectValue placeholder="Selecione o titular" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormFieldError messages={state?.fieldErrors?.profileId} />
          </div>

          {account ? (
            <p className="text-xs text-muted-foreground">
              O saldo atual é atualizado automaticamente pelas transações lançadas nesta
              conta e não pode ser editado diretamente aqui.
            </p>
          ) : (
            <div>
              <Label htmlFor="acc-balance">Saldo inicial</Label>
              <MoneyInput
                id="acc-balance"
                name="currentBalance"
                defaultValue="0"
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.currentBalance}
              />
              <FormFieldError messages={state?.fieldErrors?.currentBalance} />
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || noProfiles}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
