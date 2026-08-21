"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createCreditCard, updateCreditCard } from "@/actions/credit-cards";
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
import { cardBrandOptions } from "@/lib/validations/credit-card";
import { useCloseOnSuccess } from "@/lib/hooks/use-close-on-success";

const BRAND_LABELS: Record<(typeof cardBrandOptions)[number], string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  other: "Outra",
};

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

type CreditCard = {
  id: string;
  name: string;
  institutionName: string | null;
  brand: (typeof cardBrandOptions)[number];
  lastFourDigits: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  profileId: string;
};

type ProfileOption = { id: string; name: string };

export function CreditCardFormDialog({
  card,
  profiles,
}: {
  card?: CreditCard;
  profiles: ProfileOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = card ? updateCreditCard : createCreditCard;
  const [state, formAction, pending] = useActionState(action, null);
  const [brand, setBrand] = useState<(typeof cardBrandOptions)[number]>(card?.brand ?? "visa");
  const [profileId, setProfileId] = useState(card?.profileId ?? profiles[0]?.id ?? "");
  const [closingDay, setClosingDay] = useState(String(card?.closingDay ?? 1));
  const [dueDay, setDueDay] = useState(String(card?.dueDay ?? 10));

  useCloseOnSuccess(state, setOpen);

  const noProfiles = profiles.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {card ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5" disabled={noProfiles}>
            <Plus className="size-4" />
            Novo cartão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {card ? <input type="hidden" name="id" value={card.id} /> : null}
          <input type="hidden" name="brand" value={brand} />
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="closingDay" value={closingDay} />
          <input type="hidden" name="dueDay" value={dueDay} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
          {noProfiles ? (
            <FormAlert>Crie um perfil antes de cadastrar um cartão.</FormAlert>
          ) : null}

          <div>
            <Label htmlFor="card-name">Nome</Label>
            <Input
              id="card-name"
              name="name"
              defaultValue={card?.name}
              placeholder="Ex.: Nubank Roxinho"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="card-institution">Instituição</Label>
            <Input
              id="card-institution"
              name="institutionName"
              defaultValue={card?.institutionName ?? undefined}
              placeholder="Ex.: Nubank"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.institutionName}
            />
            <FormFieldError messages={state?.fieldErrors?.institutionName} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="card-brand">Bandeira</Label>
              <Select value={brand} onValueChange={(v) => setBrand(v as typeof brand)}>
                <SelectTrigger id="card-brand" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cardBrandOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {BRAND_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="card-last4">Últimos 4 dígitos</Label>
              <Input
                id="card-last4"
                name="lastFourDigits"
                inputMode="numeric"
                maxLength={4}
                defaultValue={card?.lastFourDigits}
                placeholder="0000"
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.lastFourDigits}
              />
              <FormFieldError messages={state?.fieldErrors?.lastFourDigits} />
            </div>
          </div>

          <div>
            <Label htmlFor="card-limit">Limite</Label>
            <MoneyInput
              id="card-limit"
              name="creditLimit"
              defaultValue={card ? String(card.creditLimit) : undefined}
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.creditLimit}
            />
            <FormFieldError messages={state?.fieldErrors?.creditLimit} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="card-closing">Dia de fechamento</Label>
              <Select value={closingDay} onValueChange={setClosingDay}>
                <SelectTrigger id="card-closing" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="card-due">Dia de vencimento</Label>
              <Select value={dueDay} onValueChange={setDueDay}>
                <SelectTrigger id="card-due" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="card-profile">Titular</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger id="card-profile" className="mt-1.5 w-full">
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
