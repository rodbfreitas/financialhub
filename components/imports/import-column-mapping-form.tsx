"use client";

import { useActionState, useState } from "react";
import { mapImportColumns } from "@/actions/imports";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormAlert } from "@/components/auth/form-field-error";

type AmountMode = "signed" | "allExpense" | "allIncome" | "debitCredit";

const AMOUNT_MODE_LABELS: Record<AmountMode, string> = {
  signed: "Uma coluna com valor já assinado (negativo = despesa)",
  allExpense: "Uma coluna de valor — todas as linhas são despesas",
  allIncome: "Uma coluna de valor — todas as linhas são receitas",
  debitCredit: "Duas colunas separadas (débito e crédito)",
};

/**
 * Mapeamento manual de colunas (PRD §24): aparece quando a detecção automática não
 * consegue identificar com confiança as colunas de data/descrição/valor de um
 * CSV/XLSX. O usuário escolhe explicitamente antes de qualquer linha virar
 * transação — "O usuário confirma antes da importação."
 */
export function ImportColumnMappingForm({
  importId,
  headers,
  sampleRows,
  suggestedDateColumn,
  suggestedDescriptionColumn,
  suggestedAmountColumn,
}: {
  importId: string;
  headers: string[];
  sampleRows: string[][];
  suggestedDateColumn?: string;
  suggestedDescriptionColumn?: string;
  suggestedAmountColumn?: string;
}) {
  const [state, formAction, pending] = useActionState(mapImportColumns, null);
  const [mode, setMode] = useState<AmountMode>("signed");
  const [dateColumn, setDateColumn] = useState(suggestedDateColumn ?? headers[0] ?? "");
  const [descriptionColumn, setDescriptionColumn] = useState(suggestedDescriptionColumn ?? headers[0] ?? "");
  const [amountColumn, setAmountColumn] = useState(suggestedAmountColumn ?? headers[0] ?? "");
  const [debitColumn, setDebitColumn] = useState(headers[0] ?? "");
  const [creditColumn, setCreditColumn] = useState(headers[0] ?? "");

  const mapping =
    mode === "debitCredit"
      ? { mode, dateColumn, descriptionColumn, debitColumn, creditColumn }
      : { mode, dateColumn, descriptionColumn, amountColumn };

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRows.slice(0, 5).map((row, i) => (
              <TableRow key={i}>
                {headers.map((h, j) => (
                  <TableCell key={h} className="text-xs text-muted-foreground">
                    {row[j] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="importId" value={importId} />
        <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />

        {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Coluna de data</Label>
            <Select value={dateColumn} onValueChange={setDateColumn}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Coluna de descrição</Label>
            <Select value={descriptionColumn} onValueChange={setDescriptionColumn}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Como identificar receita/despesa</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as AmountMode)}>
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AMOUNT_MODE_LABELS) as AmountMode[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {AMOUNT_MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === "debitCredit" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Coluna de débito</Label>
              <Select value={debitColumn} onValueChange={setDebitColumn}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coluna de crédito</Label>
              <Select value={creditColumn} onValueChange={setCreditColumn}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div>
            <Label>Coluna de valor</Label>
            <Select value={amountColumn} onValueChange={setAmountColumn}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Processando…" : "Aplicar mapeamento"}
        </Button>
      </form>
    </div>
  );
}
