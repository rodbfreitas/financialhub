"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createGoal, updateGoal } from "@/actions/goals";
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
import { goalStatusOptions } from "@/lib/validations/goal";

const STATUS_LABELS: Record<(typeof goalStatusOptions)[number], string> = {
  in_progress: "Em andamento",
  completed: "Concluída",
  paused: "Pausada",
  cancelled: "Cancelada",
};

type ProfileOption = { id: string; name: string };

type Goal = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  monthlyContribution: number | null;
  profileId: string | null;
  status: (typeof goalStatusOptions)[number];
};

export function GoalFormDialog({ goal, profiles }: { goal?: Goal; profiles: ProfileOption[] }) {
  const [open, setOpen] = useState(false);
  const action = goal ? updateGoal : createGoal;
  const [state, formAction, pending] = useActionState(action, null);

  const [profileId, setProfileId] = useState(goal?.profileId ?? "");
  const [status, setStatus] = useState<(typeof goalStatusOptions)[number]>(goal?.status ?? "in_progress");

  useCloseOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {goal ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Nova meta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="status" value={status} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="gl-name">Nome</Label>
            <Input
              id="gl-name"
              name="name"
              defaultValue={goal?.name}
              placeholder="Ex.: Reserva de emergência"
              className="mt-1.5"
              aria-invalid={!!state?.fieldErrors?.name}
            />
            <FormFieldError messages={state?.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="gl-description">Descrição (opcional)</Label>
            <Textarea
              id="gl-description"
              name="description"
              defaultValue={goal?.description ?? undefined}
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gl-target">Valor alvo</Label>
              <MoneyInput
                id="gl-target"
                name="targetAmount"
                defaultValue={goal ? String(goal.targetAmount) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.targetAmount}
              />
              <FormFieldError messages={state?.fieldErrors?.targetAmount} />
            </div>
            <div>
              <Label htmlFor="gl-current">Valor atual</Label>
              <MoneyInput
                id="gl-current"
                name="currentAmount"
                defaultValue={goal ? String(goal.currentAmount) : "0"}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.currentAmount}
              />
              <FormFieldError messages={state?.fieldErrors?.currentAmount} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gl-date">Prazo (opcional)</Label>
              <Input
                id="gl-date"
                name="targetDate"
                type="date"
                defaultValue={goal?.targetDate ?? undefined}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="gl-contribution">Contribuição mensal (opcional)</Label>
              <MoneyInput
                id="gl-contribution"
                name="monthlyContribution"
                defaultValue={goal?.monthlyContribution ? String(goal.monthlyContribution) : undefined}
                className="mt-1.5"
                aria-invalid={!!state?.fieldErrors?.monthlyContribution}
              />
              <FormFieldError messages={state?.fieldErrors?.monthlyContribution} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gl-profile">Responsável</Label>
              <Select value={profileId || "family"} onValueChange={(v) => setProfileId(v === "family" ? "" : v)}>
                <SelectTrigger id="gl-profile" className="mt-1.5 w-full">
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
            <div>
              <Label htmlFor="gl-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger id="gl-status" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goalStatusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {STATUS_LABELS[opt]}
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
