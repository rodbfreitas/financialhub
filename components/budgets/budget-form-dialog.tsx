"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createBudget, updateBudget } from "@/actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
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
import { budgetPeriodTypeOptions } from "@/lib/validations/budget";

const PERIOD_TYPE_LABELS: Record<(typeof budgetPeriodTypeOptions)[number], string> = {
  monthly: "Mensal",
  custom: "Personalizado",
};

type ProfileOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };

type BudgetItemRow = {
  key: string;
  categoryId: string;
  subcategoryId: string;
  amountRaw: string;
};

type ExistingItem = { categoryId: string; subcategoryId: string | null; plannedAmount: number };

type Budget = {
  id: string;
  name: string;
  periodType: (typeof budgetPeriodTypeOptions)[number];
  startDate: string;
  endDate: string;
  totalLimit: number | null;
  profileId: string | null;
  items: ExistingItem[];
};

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return `budget-row-${rowKeySeq}`;
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function lastDayOfMonthISO(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export function BudgetFormDialog({
  budget,
  profiles,
  categories,
}: {
  budget?: Budget;
  profiles: ProfileOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const action = budget ? updateBudget : createBudget;
  const [state, formAction, pending] = useActionState(action, null);

  const [periodType, setPeriodType] = useState<(typeof budgetPeriodTypeOptions)[number]>(
    budget?.periodType ?? "monthly",
  );
  const [profileId, setProfileId] = useState(budget?.profileId ?? "");
  const [rows, setRows] = useState<BudgetItemRow[]>(() =>
    budget && budget.items.length > 0
      ? budget.items.map((item) => ({
          key: nextKey(),
          categoryId: item.categoryId,
          subcategoryId: item.subcategoryId ?? "",
          amountRaw: String(item.plannedAmount),
        }))
      : [{ key: nextKey(), categoryId: "", subcategoryId: "", amountRaw: "" }],
  );

  useCloseOnSuccess(state, setOpen);

  // Se o dialog fechar sem salvar (cancelado), não precisamos resetar — ele é
  // desmontado/remontado pelo Dialog (Radix não mantém o form no DOM quando fechado
  // com `forceMount` ausente), então o estado local já nasce limpo na próxima abertura.

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (parseMoneyInput(r.amountRaw) ?? 0), 0),
    [rows],
  );

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.categoryId && parseMoneyInput(r.amountRaw))
          .map((r) => ({
            categoryId: r.categoryId,
            subcategoryId: r.subcategoryId || undefined,
            plannedAmount: parseMoneyInput(r.amountRaw) ?? 0,
          })),
      ),
    [rows],
  );

  function addRow() {
    setRows((prev) => [...prev, { key: nextKey(), categoryId: "", subcategoryId: "", amountRaw: "" }]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function updateRow(key: string, patch: Partial<BudgetItemRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {budget ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Novo orçamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{budget ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {budget ? <input type="hidden" name="id" value={budget.id} /> : null}
          <input type="hidden" name="periodType" value={periodType} />
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="items" value={itemsJson} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="bg-name">Nome</Label>
            <Input
              id="bg-name"
              name="name"
              defaultValue={budget?.name}
              placeholder="Ex.: Orçamento de agosto"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bg-start">Início</Label>
              <Input
                id="bg-start"
                name="startDate"
                type="date"
                defaultValue={budget?.startDate ?? todayISO().slice(0, 8) + "01"}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.startDate}
              />
              <FormFieldError messages={state?.fieldErrors?.startDate} />
            </div>
            <div>
              <Label htmlFor="bg-end">Fim</Label>
              <Input
                id="bg-end"
                name="endDate"
                type="date"
                defaultValue={budget?.endDate ?? lastDayOfMonthISO()}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.endDate}
              />
              <FormFieldError messages={state?.fieldErrors?.endDate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bg-period">Tipo de período</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as typeof periodType)}>
                <SelectTrigger id="bg-period" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgetPeriodTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {PERIOD_TYPE_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bg-profile">Titular</Label>
              <Select value={profileId || "family"} onValueChange={(v) => setProfileId(v === "family" ? "" : v)}>
                <SelectTrigger id="bg-profile" className="mt-1.5 w-full">
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

          <div>
            <Label htmlFor="bg-limit">Limite total (opcional)</Label>
            <MoneyInput
              id="bg-limit"
              name="totalLimit"
              defaultValue={budget?.totalLimit ? String(budget.totalLimit) : undefined}
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.totalLimit}
            />
            <FormFieldError messages={state?.fieldErrors?.totalLimit} />
          </div>

          <div className="flex flex-col gap-3">
            <Label>Categorias planejadas</Label>
            {rows.map((row) => {
              const rowCategory = categories.find((c) => c.id === row.categoryId);
              return (
                <div key={row.key} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={row.categoryId || "none"}
                      onValueChange={(v) => updateRow(row.key, { categoryId: v === "none" ? "" : v, subcategoryId: "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={row.subcategoryId || "none"}
                      onValueChange={(v) => updateRow(row.key, { subcategoryId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger className="w-full" disabled={!rowCategory}>
                        <SelectValue placeholder="Subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {(rowCategory?.subcategories ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0,00"
                        value={row.amountRaw}
                        onChange={(e) => updateRow(row.key, { amountRaw: e.target.value })}
                        className="pl-9 text-right tabular-nums"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label="Remover esta categoria do orçamento"
                      title="Remover esta categoria do orçamento"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" className="gap-1.5 self-start" onClick={addRow}>
              <Plus className="size-4" />
              Adicionar categoria
            </Button>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total planejado</span>
              <span className="font-medium">{formatMoney(Math.round(total * 100) / 100)}</span>
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
