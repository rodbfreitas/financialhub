"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createRecurring, updateRecurring } from "@/actions/recurring";
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
  recurringTypeOptions,
  recurringFrequencyOptions,
  recurringPaymentMethodOptions,
} from "@/lib/validations/recurring";

const TYPE_LABELS: Record<(typeof recurringTypeOptions)[number], string> = {
  income: "Receita",
  expense: "Despesa",
};

const FREQUENCY_LABELS: Record<(typeof recurringFrequencyOptions)[number], string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

const PAYMENT_LABELS: Record<(typeof recurringPaymentMethodOptions)[number], string> = {
  account: "Conta",
  credit_card: "Cartão de crédito",
  none: "Nenhuma",
};

type ProfileOption = { id: string; name: string };
type AccountOption = { id: string; name: string };
type CreditCardOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };

type Recurring = {
  id: string;
  type: (typeof recurringTypeOptions)[number];
  description: string;
  amount: number;
  frequency: (typeof recurringFrequencyOptions)[number];
  interval: number;
  startDate: string;
  endDate: string | null;
  profileId: string;
  paymentMethod: (typeof recurringPaymentMethodOptions)[number];
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

export function RecurringFormDialog({
  recurring,
  profiles,
  accounts,
  creditCards,
  categories,
}: {
  recurring?: Recurring;
  profiles: ProfileOption[];
  accounts: AccountOption[];
  creditCards: CreditCardOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = recurring ? updateRecurring : createRecurring;
  const [state, formAction, pending] = useActionState(action, null);

  const [type, setType] = useState<(typeof recurringTypeOptions)[number]>(recurring?.type ?? "expense");
  const [frequency, setFrequency] = useState<(typeof recurringFrequencyOptions)[number]>(
    recurring?.frequency ?? "monthly",
  );
  const [profileId, setProfileId] = useState(recurring?.profileId ?? profiles[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<(typeof recurringPaymentMethodOptions)[number]>(
    recurring?.paymentMethod ?? (accounts.length > 0 ? "account" : "none"),
  );
  const [accountId, setAccountId] = useState(recurring?.accountId ?? accounts[0]?.id ?? "");
  const [creditCardId, setCreditCardId] = useState(recurring?.creditCardId ?? creditCards[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(recurring?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(recurring?.subcategoryId ?? "");

  useCloseOnSuccess(state, setOpen);

  const availableSubcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {recurring ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Nova recorrência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recurring ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {recurring ? <input type="hidden" name="id" value={recurring.id} /> : null}
          <input type="hidden" name="type" value={type} />
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

          <div>
            <Label htmlFor="rc-description">Descrição</Label>
            <Input
              id="rc-description"
              name="description"
              defaultValue={recurring?.description}
              placeholder="Ex.: Netflix"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.description}
            />
            <FormFieldError messages={state?.fieldErrors?.description} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rc-type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="rc-type" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurringTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {TYPE_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rc-amount">Valor</Label>
              <MoneyInput
                id="rc-amount"
                name="amount"
                defaultValue={recurring ? String(recurring.amount) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.amount}
              />
              <FormFieldError messages={state?.fieldErrors?.amount} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rc-frequency">Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger id="rc-frequency" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurringFrequencyOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {FREQUENCY_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rc-interval">A cada</Label>
              <Input
                id="rc-interval"
                name="interval"
                inputMode="numeric"
                defaultValue={recurring ? String(recurring.interval) : "1"}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.interval}
              />
              <FormFieldError messages={state?.fieldErrors?.interval} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rc-start">Início</Label>
              <Input
                id="rc-start"
                name="startDate"
                type="date"
                defaultValue={recurring?.startDate ?? todayISO()}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.startDate}
              />
              <FormFieldError messages={state?.fieldErrors?.startDate} />
            </div>

            <div>
              <Label htmlFor="rc-end">Fim (opcional)</Label>
              <Input
                id="rc-end"
                name="endDate"
                type="date"
                defaultValue={recurring?.endDate ?? undefined}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rc-profile">Titular</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger id="rc-profile" className="mt-1.5 w-full">
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
            <Label htmlFor="rc-payment">Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
            >
              <SelectTrigger id="rc-payment" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recurringPaymentMethodOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {PAYMENT_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "account" ? (
            <div>
              <Label htmlFor="rc-account">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="rc-account" className="mt-1.5 w-full">
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
              <Label htmlFor="rc-card">Cartão</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger id="rc-card" className="mt-1.5 w-full">
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
              <Label htmlFor="rc-category">Categoria</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => {
                  setCategoryId(v === "none" ? "" : v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger id="rc-category" className="mt-1.5 w-full">
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
              <Label htmlFor="rc-subcategory">Subcategoria</Label>
              <Select
                value={subcategoryId || "none"}
                onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="rc-subcategory" className="mt-1.5 w-full" disabled={!categoryId}>
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
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
