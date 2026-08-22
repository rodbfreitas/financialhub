"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createLiability, updateLiability } from "@/actions/liabilities";
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
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";
import { liabilityTypeOptions } from "@/lib/validations/liability";

export const LIABILITY_TYPE_LABELS: Record<(typeof liabilityTypeOptions)[number], string> = {
  financing: "Financiamento",
  loan: "Empréstimo",
  debt: "Dívida",
};

type ProfileOption = { id: string; name: string };

type Liability = {
  id: string;
  name: string;
  type: (typeof liabilityTypeOptions)[number];
  currentBalance: number;
  interestRate: number | null;
  dueDate: string | null;
  profileId: string | null;
};

export function LiabilityFormDialog({ liability, profiles }: { liability?: Liability; profiles: ProfileOption[] }) {
  const [open, setOpen] = useState(false);
  const action = liability ? updateLiability : createLiability;
  const [state, formAction, pending] = useActionState(action, null);

  const [type, setType] = useState<(typeof liabilityTypeOptions)[number]>(liability?.type ?? "loan");
  const [profileId, setProfileId] = useState(liability?.profileId ?? "");

  useCloseOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {liability ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Novo passivo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{liability ? "Editar passivo" : "Novo passivo"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {liability ? <input type="hidden" name="id" value={liability.id} /> : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="profileId" value={profileId} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="lb-name">Nome</Label>
            <Input
              id="lb-name"
              name="name"
              defaultValue={liability?.name}
              placeholder="Ex.: Financiamento do apê, Empréstimo pessoal"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="lb-type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="lb-type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {liabilityTypeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {LIABILITY_TYPE_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lb-balance">Saldo devedor</Label>
              <MoneyInput
                id="lb-balance"
                name="currentBalance"
                defaultValue={liability ? String(liability.currentBalance) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.currentBalance}
              />
              <FormFieldError messages={state?.fieldErrors?.currentBalance} />
            </div>
            <div>
              <Label htmlFor="lb-rate">Taxa de juros % a.m. (opcional)</Label>
              <Input
                id="lb-rate"
                name="interestRate"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={liability?.interestRate ? String(liability.interestRate) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.interestRate}
              />
              <FormFieldError messages={state?.fieldErrors?.interestRate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lb-due">Vencimento final (opcional)</Label>
              <Input
                id="lb-due"
                name="dueDate"
                type="date"
                defaultValue={liability?.dueDate ?? undefined}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="lb-profile">Responsável (opcional)</Label>
              <Select value={profileId || "family"} onValueChange={(v) => setProfileId(v === "family" ? "" : v)}>
                <SelectTrigger id="lb-profile" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Familiar (todos)</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
