"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Pencil, ArrowLeft, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  acceptCandidate,
  acceptEvent,
  editEvent,
  rejectCandidate,
  rejectEvent,
} from "@/actions/document-review";
import type { ReviewQueueItem } from "@/lib/documents/review/queue";
import type { Database } from "@/types/database";

type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];
type RelationType = Database["public"]["Enums"]["reconciliation_relation_type"];

const EVENT_TYPE_LABELS: Record<FinancialEventType, string> = {
  purchase: "Compra",
  income: "Receita",
  payment: "Pagamento",
  transfer: "Transferência",
  pix_sent: "PIX enviado",
  pix_received: "PIX recebido",
  boleto_payment: "Pagamento de boleto",
  card_payment: "Pagamento de fatura",
  refund: "Estorno",
  fee: "Tarifa",
  interest: "Juros",
  penalty: "Multa",
  yield: "Rendimento",
  withdrawal: "Saque",
  deposit: "Depósito",
  installment: "Parcela",
  direct_debit: "Débito automático",
  unknown: "Não identificado",
};

const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  DUPLICATE: "Possível duplicata",
  RELATED: "Pode estar relacionado",
  SETTLEMENT: "Pode ser a quitação",
  TRANSFER_PAIR: "Par de transferência",
  REFUND: "Pode ser o estorno",
  INSTALLMENT: "Parcela",
  BILL_PAYMENT: "Pode quitar esta fatura/boleto",
};

function formatMoney(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

type LocalCandidate = ReviewQueueItem["candidates"][number];
type LocalItem = ReviewQueueItem & { candidates: LocalCandidate[] };

/**
 * Fase 2 — Macrofase 8 (UX/UI 2.0 DOC-05 "Fila de Revisão"): fila de decisões,
 * um item por vez — nunca uma tabela infinita. Decisão salva imediatamente
 * (Server Action), progresso "X de Y" sempre visível, "revisar depois" só pula
 * pra próximo sem persistir nada (o item continua pendente pra uma próxima
 * visita a este documento).
 */
export function ReviewQueue({ documentId, initialItems }: { documentId: string; initialItems: ReviewQueueItem[] }) {
  const [items, setItems] = useState<LocalItem[]>(initialItems);
  const [cursor, setCursor] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editEventType, setEditEventType] = useState<FinancialEventType>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = initialItems.length;
  const decided = total - items.length;
  const current = items[cursor % Math.max(items.length, 1)];

  function startEditing() {
    if (!current) return;
    setEditEventType(current.eventType);
    setIsEditing(true);
  }

  function removeCurrentAndAdvance() {
    setItems((prev) => prev.filter((_, i) => i !== cursor % Math.max(prev.length, 1)));
    setIsEditing(false);
  }

  function skip() {
    if (items.length <= 1) return;
    setCursor((c) => (c + 1) % items.length);
    setIsEditing(false);
  }

  function updateCandidateLocally(candidateId: string) {
    setItems((prev) =>
      prev.map((item) => ({ ...item, candidates: item.candidates.filter((c) => c.candidateId !== candidateId) })),
    );
  }

  function handleAcceptEvent() {
    if (!current) return;
    setError(null);
    startTransition(async () => {
      const result = await acceptEvent(documentId, current.interpretedEventId);
      if (result?.error) setError(result.error);
      else removeCurrentAndAdvance();
    });
  }

  function handleRejectEvent() {
    if (!current) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectEvent(documentId, current.interpretedEventId);
      if (result?.error) setError(result.error);
      else removeCurrentAndAdvance();
    });
  }

  function handleEditEvent(formData: FormData) {
    if (!current) return;
    setError(null);
    const eventType = String(formData.get("eventType") || "unknown") as FinancialEventType;
    const amount = Number(formData.get("amount"));
    const effectiveDate = String(formData.get("effectiveDate") || "");
    const merchant = String(formData.get("merchant") || "").trim();

    if (!effectiveDate || Number.isNaN(amount)) {
      setError("Preencha valor e data corretamente.");
      return;
    }

    startTransition(async () => {
      const result = await editEvent({
        documentId,
        interpretedEventId: current.interpretedEventId,
        eventType,
        amount,
        effectiveDate,
        merchantNormalized: merchant || null,
      });
      if (result?.error) setError(result.error);
      else removeCurrentAndAdvance();
    });
  }

  function handleAcceptCandidate(candidateId: string) {
    setError(null);
    startTransition(async () => {
      const result = await acceptCandidate(documentId, candidateId);
      if (result?.error) setError(result.error);
      else updateCandidateLocally(candidateId);
    });
  }

  function handleRejectCandidate(candidateId: string) {
    setError(null);
    startTransition(async () => {
      const result = await rejectCandidate(documentId, candidateId);
      if (result?.error) setError(result.error);
      else updateCandidateLocally(candidateId);
    });
  }

  if (!current) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <PartyPopper className="size-8 text-primary" />
          <div>
            <p className="font-medium text-foreground">Tudo revisado por aqui</p>
            <p className="text-sm text-muted-foreground">
              {decided} de {total} itens revisados neste documento.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/documentos/${documentId}`}>Voltar pro documento</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/documentos/${documentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Documento
        </Link>
        <span className="text-sm text-muted-foreground">
          {decided} de {total} revisados
        </span>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-foreground">
                {current.merchantNormalized || current.rawDescription || "Descrição não identificada"}
              </p>
              <p className="text-xs text-muted-foreground">
                {EVENT_TYPE_LABELS[current.eventType]} · {formatDate(current.effectiveDate)}
                {current.installmentCurrent && current.installmentTotal
                  ? ` · Parcela ${current.installmentCurrent}/${current.installmentTotal}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={(current.interpretationConfidence ?? 0) >= 0.6 ? "outline" : "warning"}>
                {(current.interpretationConfidence ?? 0) >= 0.6 ? "Confiança razoável" : "Confiança baixa — confira"}
              </Badge>
              <span className="text-lg font-semibold tabular-nums text-foreground">{formatMoney(current.amount)}</span>
            </div>
          </div>

          {isEditing ? (
            <form
              action={handleEditEvent}
              className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="eventType">Tipo</Label>
                  <input type="hidden" name="eventType" value={editEventType} />
                  <Select value={editEventType} onValueChange={(v) => setEditEventType(v as FinancialEventType)}>
                    <SelectTrigger id="eventType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={current.amount ?? undefined}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="effectiveDate">Data</Label>
                  <Input
                    id="effectiveDate"
                    name="effectiveDate"
                    type="date"
                    defaultValue={current.effectiveDate ?? undefined}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="merchant">Descrição</Label>
                  <Input id="merchant" name="merchant" defaultValue={current.merchantNormalized ?? ""} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  Salvar correção
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5" disabled={isPending} onClick={handleAcceptEvent}>
                <Check className="size-4" />
                Aceitar
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={isPending} onClick={startEditing}>
                <Pencil className="size-4" />
                Editar
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" disabled={isPending} onClick={handleRejectEvent}>
                <X className="size-4" />
                Rejeitar
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending || items.length <= 1} onClick={skip} className="ml-auto">
                Revisar depois
              </Button>
            </div>
          )}

          {current.candidates.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                Possíveis correspondências encontradas — confirme antes de aceitar este lançamento como um item novo
              </p>
              {current.candidates.map((candidate) => (
                <div
                  key={candidate.candidateId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{RELATION_TYPE_LABELS[candidate.relationTypeSuggested]}</Badge>
                      <span className="truncate font-medium text-foreground">{candidate.label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(candidate.amount)} · {formatDate(candidate.date)}
                      {candidate.sourceDocumentName ? ` · ${candidate.sourceDocumentName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={isPending}
                      onClick={() => handleAcceptCandidate(candidate.candidateId)}
                    >
                      <Check className="size-3.5" />
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-destructive"
                      disabled={isPending}
                      onClick={() => handleRejectCandidate(candidate.candidateId)}
                    >
                      <X className="size-3.5" />
                      Não é
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
