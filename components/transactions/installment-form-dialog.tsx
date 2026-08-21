"use client";

import { useActionState, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { createInstallmentPlan } from "@/actions/installments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, parseMoneyInput } from "@/lib/money";
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
type CreditCardOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function InstallmentFormDialog({
  profiles,
  creditCards,
  categories,
}: {
  profiles: ProfileOption[];
  creditCards: CreditCardOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createInstallmentPlan, null);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [creditCardId, setCreditCardId] = useState(creditCards[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [totalAmountRaw, setTotalAmountRaw] = useState("");
  const [installmentCount, setInstallmentCount] = useState("2");

  useCloseOnSuccess(state, setOpen);

  const availableSubcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId],
  );

  const preview = useMemo(() => {
    const total = parseMoneyInput(totalAmountRaw);
    const count = Number(installmentCount);
    if (total === null || !Number.isInteger(count) || count < 2) return null;
    const base = Math.round((total / count) * 100) / 100;
    return `${count}x de ${formatMoney(base)}`;
  }, [totalAmountRaw, installmentCount]);

  const canCreate = creditCards.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!canCreate}>
          <Layers className="size-4" />
          Parcelar compra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo parcelamento</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="creditCardId" value={creditCardId} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="subcategoryId" value={subcategoryId} />
          <input type="hidden" name="installmentCount" value={installmentCount} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
          {!canCreate ? <FormAlert>Cadastre um cartão antes de parcelar uma compra.</FormAlert> : null}

          <div>
            <Label htmlFor="in-description">Descrição</Label>
            <Input
              id="in-description"
              name="description"
              placeholder="Ex.: Notebook novo"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.description}
            />
            <FormFieldError messages={state?.fieldErrors?.description} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="in-total">Valor total</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="in-total"
                  name="totalAmount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={totalAmountRaw}
                  onChange={(e) => setTotalAmountRaw(e.target.value)}
                  aria-invalid={!!state?.fieldErrors?.totalAmount}
                  className="pl-9 text-right tabular-nums"
                />
              </div>
              <FormFieldError messages={state?.fieldErrors?.totalAmount} />
            </div>

            <div>
              <Label htmlFor="in-count">Parcelas</Label>
              <Input
                id="in-count"
                inputMode="numeric"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.installmentCount}
              />
              <FormFieldError messages={state?.fieldErrors?.installmentCount} />
            </div>
          </div>

          {preview ? <p className="text-xs text-muted-foreground">{preview}</p> : null}

          <div>
            <Label htmlFor="in-date">Data da 1ª parcela</Label>
            <Input
              id="in-date"
              name="startDate"
              type="date"
              defaultValue={todayISO()}
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.startDate}
            />
            <FormFieldError messages={state?.fieldErrors?.startDate} />
          </div>

          <div>
            <Label htmlFor="in-card">Cartão</Label>
            <Select value={creditCardId} onValueChange={setCreditCardId}>
              <SelectTrigger id="in-card" className="mt-1.5 w-full">
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

          <div>
            <Label htmlFor="in-profile">Titular</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger id="in-profile" className="mt-1.5 w-full">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="in-category">Categoria</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => {
                  setCategoryId(v === "none" ? "" : v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger id="in-category" className="mt-1.5 w-full">
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
              <Label htmlFor="in-subcategory">Subcategoria</Label>
              <Select
                value={subcategoryId || "none"}
                onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="in-subcategory" className="mt-1.5 w-full" disabled={!categoryId}>
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
            <Button type="submit" disabled={pending || !canCreate}>
              {pending ? "Salvando…" : "Criar parcelamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
