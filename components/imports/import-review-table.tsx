"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { confirmImport, cancelImport } from "@/actions/imports";
import { parseMoneyInput } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormAlert } from "@/components/auth/form-field-error";

type ProfileOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: { id: string; name: string }[] };

export type ReviewRow = {
  id: string;
  isDuplicate: boolean;
  hasError: boolean;
  errorMessage?: string;
  include?: boolean;
  date: string;
  description: string;
  type: "income" | "expense";
  amountText: string;
  profileId: string;
  categoryId: string;
  subcategoryId: string;
};

/**
 * Tabela de revisão de importação (Design System §37, Prompt Mestre §26): permite
 * corrigir data/descrição/valor, trocar categoria/perfil, ver duplicidades sinalizadas
 * e escolher quais linhas viram transação de verdade. Nada é criado até o usuário
 * clicar em "Confirmar importação".
 */
export function ImportReviewTable({
  importId,
  rows,
  profiles,
  categories,
  defaultProfileId,
}: {
  importId: string;
  rows: ReviewRow[];
  profiles: ProfileOption[];
  categories: CategoryOption[];
  defaultProfileId: string;
}) {
  const [rowState, setRowState] = useState<ReviewRow[]>(rows);
  const [state, formAction, pending] = useActionState(confirmImport, null);
  const [cancelPending, startCancel] = useTransition();
  const router = useRouter();

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function updateRow(id: string, patch: Partial<ReviewRow>) {
    setRowState((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const includedCount = rowState.filter((r) => r.include !== false).length;

  function buildPayload() {
    return rowState.map((r) => {
      const include = r.include !== false && !r.hasError;
      const parsedAmount = parseMoneyInput(r.amountText) ?? 0;
      const signed = r.type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      return {
        id: r.id,
        include,
        date: r.date || "1970-01-01",
        description: r.description.trim() || "(sem descrição)",
        amount: signed !== 0 ? signed : -0.01,
        profileId: r.profileId || defaultProfileId,
        categoryId: r.categoryId || undefined,
        subcategoryId: r.subcategoryId || undefined,
      };
    });
  }

  return (
    <form
      action={(formData) => {
        formData.set("payload", JSON.stringify({ importId, rows: buildPayload() }));
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}
      {state?.success ? (
        <div className="rounded-md border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
          {state.success}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowState.map((row) => {
              const included = row.include !== false && !row.hasError;
              const category = categoryMap.get(row.categoryId);
              return (
                <TableRow key={row.id} className={!included ? "opacity-50" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={included}
                      disabled={row.hasError}
                      onCheckedChange={(v) => updateRow(row.id, { include: v === true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, { date: e.target.value })}
                      className="h-8 w-36"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      className="h-8 min-w-48"
                    />
                    {row.hasError ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-negative">
                        <AlertTriangle className="size-3" /> {row.errorMessage ?? "dados incompletos"}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.categoryId || "none"}
                      onValueChange={(v) => updateRow(row.id, { categoryId: v === "none" ? "" : v, subcategoryId: "" })}
                    >
                      <SelectTrigger className="h-8 w-40">
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
                    {category && category.subcategories.length > 0 ? (
                      <Select
                        value={row.subcategoryId || "none"}
                        onValueChange={(v) => updateRow(row.id, { subcategoryId: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="mt-1 h-8 w-40">
                          <SelectValue placeholder="Subcategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {category.subcategories.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Select value={row.profileId} onValueChange={(v) => updateRow(row.id, { profileId: v })}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Select
                        value={row.type}
                        onValueChange={(v) => updateRow(row.id, { type: v as "income" | "expense" })}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Despesa</SelectItem>
                          <SelectItem value="income">Receita</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
                          R$
                        </span>
                        <Input
                          value={row.amountText}
                          onChange={(e) => updateRow(row.id, { amountText: e.target.value })}
                          inputMode="decimal"
                          className="h-8 w-24 pl-7 text-right tabular-nums"
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.isDuplicate ? (
                      <Badge variant="warning" className="gap-1">
                        <Copy className="size-3" /> Duplicada
                      </Badge>
                    ) : row.hasError ? (
                      <Badge variant="negative">Erro</Badge>
                    ) : (
                      <Badge variant="outline">Nova</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={cancelPending}
          onClick={() => {
            if (!window.confirm("Cancelar esta importação? Nenhuma transação será criada.")) return;
            startCancel(async () => {
              const result = await cancelImport(importId);
              if (result?.error) toast.error(result.error);
              else {
                if (result?.success) toast.success(result.success);
                router.refresh();
              }
            });
          }}
        >
          Cancelar importação
        </Button>
        <Button type="submit" disabled={pending || includedCount === 0}>
          {pending ? "Confirmando…" : `Confirmar importação (${includedCount})`}
        </Button>
      </div>
    </form>
  );
}
