"use client";

import { useActionState, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { createTransfer } from "@/actions/transfers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

type ProfileOption = { id: string; name: string };
type AccountOption = { id: string; name: string };

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function TransferFormDialog({
  profiles,
  accounts,
}: {
  profiles: ProfileOption[];
  accounts: AccountOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTransfer, null);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");

  useCloseOnSuccess(state, setOpen);

  const canTransfer = accounts.length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!canTransfer}>
          <ArrowLeftRight className="size-4" />
          Transferência
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova transferência</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="fromAccountId" value={fromAccountId} />
          <input type="hidden" name="toAccountId" value={toAccountId} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
          {!canTransfer ? (
            <FormAlert>Você precisa de pelo menos duas contas ativas para transferir.</FormAlert>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tr-from">De</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger id="tr-from" className="mt-1.5 w-full">
                  <SelectValue placeholder="Conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tr-to">Para</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger id="tr-to" className="mt-1.5 w-full">
                  <SelectValue placeholder="Conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormFieldError messages={state?.fieldErrors?.toAccountId} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tr-amount">Valor</Label>
              <MoneyInput
                id="tr-amount"
                name="amount"
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.amount}
              />
              <FormFieldError messages={state?.fieldErrors?.amount} />
            </div>

            <div>
              <Label htmlFor="tr-date">Data</Label>
              <Input
                id="tr-date"
                name="transactionDate"
                type="date"
                defaultValue={todayISO()}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.transactionDate}
              />
              <FormFieldError messages={state?.fieldErrors?.transactionDate} />
            </div>
          </div>

          <div>
            <Label htmlFor="tr-profile">Titular</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger id="tr-profile" className="mt-1.5 w-full">
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
          </div>

          <div>
            <Label htmlFor="tr-description">Descrição (opcional)</Label>
            <Input
              id="tr-description"
              name="description"
              placeholder="Transferência entre contas"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="tr-notes">Observações (opcional)</Label>
            <Textarea id="tr-notes" name="notes" className="mt-1.5" rows={2} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending || !canTransfer}>
              {pending ? "Salvando…" : "Transferir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
