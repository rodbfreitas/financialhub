"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { createImport } from "@/actions/imports";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormAlert, FormFieldError } from "@/components/auth/form-field-error";
import { importDestinationOptions } from "@/lib/validations/import";

const DESTINATION_LABELS: Record<(typeof importDestinationOptions)[number], string> = {
  account: "Conta",
  credit_card: "Cartão de crédito",
};

type AccountOption = { id: string; name: string };
type CreditCardOption = { id: string; name: string };

export function ImportUploadDialog({
  accounts,
  creditCards,
}: {
  accounts: AccountOption[];
  creditCards: CreditCardOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createImport, null);
  const [destination, setDestination] = useState<(typeof importDestinationOptions)[number]>(
    accounts.length > 0 ? "account" : "credit_card",
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [creditCardId, setCreditCardId] = useState(creditCards[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Upload className="size-4" />
          Nova importação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar dados</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
          <input type="hidden" name="destination" value={destination} />
          <input type="hidden" name="accountId" value={destination === "account" ? accountId : ""} />
          <input type="hidden" name="creditCardId" value={destination === "credit_card" ? creditCardId : ""} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="import-file">Arquivo</Label>
            <label
              htmlFor="import-file"
              className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-secondary/40 px-4 py-8 text-center transition-colors hover:bg-secondary/70"
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {fileName ?? "Arraste seu arquivo aqui ou clique para selecionar"}
              </span>
              <span className="text-xs text-muted-foreground">PDF, Excel, CSV ou OFX — até 10 MB</span>
            </label>
            <input
              id="import-file"
              name="file"
              type="file"
              accept=".csv,.xls,.xlsx,.ofx,.pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </div>

          <div>
            <Label htmlFor="import-destination">Importar para</Label>
            <Select value={destination} onValueChange={(v) => setDestination(v as typeof destination)}>
              <SelectTrigger id="import-destination" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {importDestinationOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {DESTINATION_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === "account" ? (
            <div>
              <Label htmlFor="import-account">Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="import-account" className="mt-1.5 w-full">
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

          {destination === "credit_card" ? (
            <div>
              <Label htmlFor="import-card">Cartão</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger id="import-card" className="mt-1.5 w-full">
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

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando…" : "Enviar e processar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
