"use client";

import { useMemo, useState, useTransition } from "react";
import { SplitSquareHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { replaceTransactionSplits } from "@/actions/splits";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";

type ProfileOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };

type SplitRow = {
  key: string;
  profileId: string;
  categoryId: string;
  subcategoryId: string;
  amountRaw: string;
};

type ExistingSplit = {
  id: string;
  profileId: string | null;
  categoryId: string;
  subcategoryId: string | null;
  amount: number;
};

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

export function SplitDialog({
  transactionId,
  transactionAmount,
  hasSplits,
  existingSplits,
  profiles,
  categories,
}: {
  transactionId: string;
  transactionAmount: number;
  hasSplits: boolean;
  existingSplits: ExistingSplit[];
  profiles: ProfileOption[];
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<SplitRow[]>(() =>
    existingSplits.length > 0
      ? existingSplits.map((s) => ({
          key: nextKey(),
          profileId: s.profileId ?? "",
          categoryId: s.categoryId,
          subcategoryId: s.subcategoryId ?? "",
          amountRaw: String(s.amount),
        }))
      : [],
  );

  const sum = useMemo(
    () => rows.reduce((acc, r) => acc + (parseMoneyInput(r.amountRaw) ?? 0), 0),
    [rows],
  );
  const roundedSum = Math.round(sum * 100) / 100;
  const balanced = rows.length === 0 || roundedSum === transactionAmount;

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: nextKey(), profileId: "", categoryId: "", subcategoryId: "", amountRaw: "" },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<SplitRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleSave() {
    if (!balanced) {
      toast.error("A soma das divisões precisa ser igual ao valor da transação.");
      return;
    }
    const payload = rows.map((r) => ({
      profileId: r.profileId || undefined,
      categoryId: r.categoryId,
      subcategoryId: r.subcategoryId || undefined,
      amount: parseMoneyInput(r.amountRaw) ?? 0,
    }));

    if (payload.some((p) => !p.categoryId)) {
      toast.error("Selecione a categoria em todas as linhas.");
      return;
    }

    startTransition(async () => {
      const result = await replaceTransactionSplits(transactionId, payload);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground data-[active=true]:text-primary"
          data-active={hasSplits}
          title={hasSplits ? "Editar divisão" : "Dividir transação"}
        >
          <SplitSquareHorizontal className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dividir transação</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Valor da transação: <span className="font-medium text-foreground">{formatMoney(transactionAmount)}</span>
          </p>

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

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select
                    value={row.profileId || "shared"}
                    onValueChange={(v) => updateRow(row.key, { profileId: v === "shared" ? "" : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Perfil (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Sem perfil específico</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
                        R$
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={row.amountRaw}
                        onChange={(e) => updateRow(row.key, { amountRaw: e.target.value })}
                        className="w-28 pl-7 text-right tabular-nums"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" className="gap-1.5 self-start" onClick={addRow}>
            <Plus className="size-4" />
            Adicionar linha
          </Button>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Soma das divisões</span>
            <span className={balanced ? "text-foreground" : "text-destructive"}>
              {formatMoney(roundedSum)}
            </span>
          </div>
          {!balanced ? (
            <p className="text-xs text-destructive">
              A soma precisa ser igual a {formatMoney(transactionAmount)} (ou remova todas as
              linhas para não dividir).
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={pending || !balanced}>
            {pending ? "Salvando…" : "Salvar divisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
