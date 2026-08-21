"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createSubscription, updateSubscription } from "@/actions/subscriptions";
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
import {
  subscriptionFrequencyOptions,
  subscriptionPaymentMethodOptions,
} from "@/lib/validations/subscription";

const FREQUENCY_LABELS: Record<(typeof subscriptionFrequencyOptions)[number], string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

const PAYMENT_LABELS: Record<(typeof subscriptionPaymentMethodOptions)[number], string> = {
  account: "Conta",
  credit_card: "Cartão de crédito",
  none: "Nenhuma",
};

type ProfileOption = { id: string; name: string };
type AccountOption = { id: string; name: string };
type CreditCardOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };

type Subscription = {
  id: string;
  name: string;
  amount: number;
  frequency: (typeof subscriptionFrequencyOptions)[number];
  nextChargeDate: string;
  profileId: string;
  paymentMethod: (typeof subscriptionPaymentMethodOptions)[number];
  accountId: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function SubscriptionFormDialog({
  subscription,
  profiles,
  accounts,
  creditCards,
  categories,
}: {
  subscription?: Subscription;
  profiles: ProfileOption[];
  accounts: AccountOption[];
  creditCards: CreditCardOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = subscription ? updateSubscription : createSubscription;
  const [state, formAction, pending] = useActionState(action, null);

  const [frequency, setFrequency] = useState<(typeof subscriptionFrequencyOptions)[number]>(
    subscription?.frequency ?? "monthly",
  );
  const [profileId, setProfileId] = useState(subscription?.profileId ?? profiles[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<(typeof subscriptionPaymentMethodOptions)[number]>(
    subscription?.paymentMethod ?? (accounts.length > 0 ? "account" : "none"),
  );
  const [accountId, setAccountId] = useState(subscription?.accountId ?? accounts[0]?.id ?? "");
  const [creditCardId, setCreditCardId] = useState(subscription?.creditCardId ?? creditCards[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(subscription?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(subscription?.subcategoryId ?? "");

  useCloseOnSuccess(state, setOpen);

  const availableSubcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId],
  );

  const noProfiles = profiles.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {subscription ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5" disabled={noProfiles}>
            <Plus className="size-4" />
            Nova assinatura
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subscription ? "Editar assinatura" : "Nova assinatura"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {subscription ? <input type="hidden" name="id" value={subscription.id} /> : null}
          <input type="hidden" name="frequency" value={frequency} />
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="paymentMethod" value={paymentMethod} />
          <input type="hidden" name="accountId" value={paymentMethod === "account" ? accountId : ""} />
          <input
            type="hidden"
            name="creditCardId"
            value={paymentMethod === "credit_card" ? creditCardId : ""}
          />
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="subcategoryId" value={subcategoryId} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
          {noProfiles ? <FormAlert>Crie um perfil antes de cadastrar uma assinatura.</FormAlert> : null}

          <div>
            <Label htmlFor="sub-name">Serviço</Label>
            <Input
              id="sub-name"
              name="name"
              defaultValue={subscription?.name}
              placeholder="Ex.: Netflix"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-amount">Valor</Label>
              <MoneyInput
                id="sub-amount"
                name="amount"
                defaultValue={subscription ? String(subscription.amount) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.amount}
              />
              <FormFieldError messages={state?.fieldErrors?.amount} />
            </div>

            <div>
              <Label htmlFor="sub-frequency">Periodicidade</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger id="sub-frequency" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionFrequencyOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {FREQUENCY_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-next">Próxima cobrança</Label>
              <Input
                id="sub-next"
                name="nextChargeDate"
                type="date"
                defaultValue={subscription?.nextChargeDate ?? todayISO()}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.nextChargeDate}
              />
              <FormFieldError messages={state?.fieldErrors?.nextChargeDate} />
            </div>

            <div>
              <Label htmlFor="sub-profile">Responsável</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger id="sub-profile" className="mt-1.5 w-full">
                  <SelectValue placeholder="Selecione" />
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
          </div>

          <div>
            <Label htmlFor="sub-payment">Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
            >
              <SelectTrigger id="sub-payment" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subscriptionPaymentMethodOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {PAYMENT_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "account" ? (
            <div>
              <Label htmlFor="sub-account">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="sub-account" className="mt-1.5 w-full">
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

          {paymentMethod === "credit_card" ? (
            <div>
              <Label htmlFor="sub-card">Cartão</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger id="sub-card" className="mt-1.5 w-full">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sub-category">Categoria</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => {
                  setCategoryId(v === "none" ? "" : v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger id="sub-category" className="mt-1.5 w-full">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sub-subcategory">Subcategoria</Label>
              <Select
                value={subcategoryId || "none"}
                onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="sub-subcategory" className="mt-1.5 w-full" disabled={!categoryId}>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {availableSubcategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
