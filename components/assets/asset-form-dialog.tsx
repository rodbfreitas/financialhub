"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createAsset, updateAsset } from "@/actions/assets";
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
import { assetTypeOptions } from "@/lib/validations/asset";

export const ASSET_TYPE_LABELS: Record<(typeof assetTypeOptions)[number], string> = {
  investment: "Investimento",
  real_estate: "Imóvel",
  vehicle: "Veículo",
  other: "Outro",
};

type ProfileOption = { id: string; name: string };

type Asset = {
  id: string;
  name: string;
  type: (typeof assetTypeOptions)[number];
  currentValue: number;
  valuationDate: string;
  profileId: string | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AssetFormDialog({ asset, profiles }: { asset?: Asset; profiles: ProfileOption[] }) {
  const [open, setOpen] = useState(false);
  const action = asset ? updateAsset : createAsset;
  const [state, formAction, pending] = useActionState(action, null);

  const [type, setType] = useState<(typeof assetTypeOptions)[number]>(asset?.type ?? "investment");
  const [profileId, setProfileId] = useState(asset?.profileId ?? "");

  useCloseOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asset ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Novo ativo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Editar ativo" : "Novo ativo"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="profileId" value={profileId} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="as-name">Nome</Label>
            <Input
              id="as-name"
              name="name"
              defaultValue={asset?.name}
              placeholder="Ex.: Tesouro Direto, Apartamento, Carro"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="as-type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="as-type" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetTypeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {ASSET_TYPE_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="as-value">Valor atual</Label>
              <MoneyInput
                id="as-value"
                name="currentValue"
                defaultValue={asset ? String(asset.currentValue) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.currentValue}
              />
              <FormFieldError messages={state?.fieldErrors?.currentValue} />
            </div>
            <div>
              <Label htmlFor="as-date">Data da avaliação</Label>
              <Input
                id="as-date"
                name="valuationDate"
                type="date"
                defaultValue={asset?.valuationDate ?? todayIso()}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="as-profile">Responsável (opcional)</Label>
            <Select value={profileId || "family"} onValueChange={(v) => setProfileId(v === "family" ? "" : v)}>
              <SelectTrigger id="as-profile" className="mt-1.5 w-full">
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
