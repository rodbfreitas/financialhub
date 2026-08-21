"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createTransaction, updateTransaction } from "@/actions/transactions";
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
import {
  transactionTypeOptions,
  transactionStatusOptions,
  transactionNatureOptions,
  paymentMethodOptions,
} from "@/lib/validations/transaction";

const TYPE_LABELS: Record<(typeof transactionTypeOptions)[number], string> = {
  income: "Receita",
  expense: "Despesa",
  adjustment: "Ajuste",
};

const STATUS_LABELS: Record<(typeof transactionStatusOptions)[number], string> = {
  posted: "Efetivada",
  pending: "Pendente",
  planned: "Planejada",
  cancelled: "Cancelada",
};

const NATURE_LABELS: Record<(typeof transactionNatureOptions)[number], string> = {
  individual: "Individual",
  shared: "Compartilhada",
};

const PAYMENT_LABELS: Record<(typeof paymentMethodOptions)[number], string> = {
  account: "Conta",
  credit_card: "Cartão de crédito",
  none: "Nenhuma (dinheiro etc.)",
};

type ProfileOption = { id: string; name: string };
type AccountOption = { id: string; name: string };
type CreditCardOption = { id: string; name: string };
type CategoryOption = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

type Transaction = {
  id: string;
  type: (typeof transactionTypeOptions)[number];
  description: string;
  merchant: string | null;
  amount: number;
  transactionDate: string;
  status: (typeof transactionStatusOptions)[number];
  nature: (typeof transactionNatureOptions)[number];
  profileId: string;
  paymentMethod: (typeof paymentMethodOptions)[number];
  accountId: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  notes: string | null;
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function TransactionFormDialog({
  transaction,
  profiles,
  accounts,
  creditCards,
  categories,
}: {
  transaction?: Transaction;
  profiles: ProfileOption[];
  accounts: AccountOption[];
  creditCards: CreditCardOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = transaction ? updateTransaction : createTransaction;
  const [state, formAction, pending] = useActionState(action, null);

  const [type, setType] = useState<(typeof transactionTypeOptions)[number]>(
    transaction?.type ?? "expense",
  );
  const [status, setStatus] = useState<(typeof transactionStatusOptions)[number]>(
    transaction?.status ?? "posted",
  );
  const [nature, setNature] = useState<(typeof transactionNatureOptions)[number]>(
    transaction?.nature ?? "individual",
  );
  const [profileId, setProfileId] = useState(transaction?.profileId ?? profiles[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodOptions)[number]>(
    transaction?.paymentMethod ?? (accounts.length > 0 ? "account" : "none"),
  );
  const [accountId, setAccountId] = useState(transaction?.accountId ?? accounts[0]?.id ?? "");
  const [creditCardId, setCreditCardId] = useState(
    transaction?.creditCardId ?? creditCards[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(transaction?.subcategoryId ?? "");

  useCloseOnSuccess(state, setOpen);

  const availableSubcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {transaction ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Nova transação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar transação" : "Nova transação"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {transaction ? <input type="hidden" name="id" value={transaction.id} /> : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="nature" value={nature} />
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
            <Label htmlFor="tx-type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="tx-type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transactionTypeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {TYPE_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tx-description">Descrição</Label>
            <Input
              id="tx-description"
              name="description"
              defaultValue={transaction?.description}
              placeholder="Ex.: Supermercado Carrefour"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.description}
            />
            <FormFieldError messages={state?.fieldErrors?.description} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-amount">Valor</Label>
              <MoneyInput
                id="tx-amount"
                name="amount"
                defaultValue={transaction ? String(transaction.amount) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.amount}
              />
              <FormFieldError messages={state?.fieldErrors?.amount} />
            </div>

            <div>
              <Label htmlFor="tx-date">Data</Label>
              <Input
                id="tx-date"
                name="transactionDate"
                type="date"
                defaultValue={transaction?.transactionDate ?? todayISO()}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.transactionDate}
              />
              <FormFieldError messages={state?.fieldErrors?.transactionDate} />
            </div>
          </div>

          <div>
            <Label htmlFor="tx-profile">Titular</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger id="tx-profile" className="mt-1.5 w-full">
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

          <div>
            <Label htmlFor="tx-payment">Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
            >
              <SelectTrigger id="tx-payment" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {PAYMENT_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "account" ? (
            <div>
              <Label htmlFor="tx-account">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="tx-account" className="mt-1.5 w-full">
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
              <Label htmlFor="tx-card">Cartão</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger id="tx-card" className="mt-1.5 w-full">
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
              <Label htmlFor="tx-category">Categoria</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => {
                  setCategoryId(v === "none" ? "" : v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger id="tx-category" className="mt-1.5 w-full">
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
              <Label htmlFor="tx-subcategory">Subcategoria</Label>
              <Select
                value={subcategoryId || "none"}
                onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="tx-subcategory" className="mt-1.5 w-full" disabled={!categoryId}>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger id="tx-status" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionStatusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {STATUS_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tx-nature">Natureza</Label>
              <Select value={nature} onValueChange={(v) => setNature(v as typeof nature)}>
                <SelectTrigger id="tx-nature" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionNatureOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {NATURE_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="tx-merchant">Estabelecimento (opcional)</Label>
            <Input
              id="tx-merchant"
              name="merchant"
              defaultValue={transaction?.merchant ?? undefined}
              placeholder="Ex.: Carrefour"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.merchant}
            />
          </div>

          <div>
            <Label htmlFor="tx-notes">Observações (opcional)</Label>
            <Textarea
              id="tx-notes"
              name="notes"
              defaultValue={transaction?.notes ?? undefined}
              className="mt-1.5"
              rows={2}
            />
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
