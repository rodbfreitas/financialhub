"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFilters } from "@/components/shell/filters-context";
import {
  formatPeriodLabel,
  shiftMonthPeriod,
  currentMonthPeriod,
  type PeriodFilter,
} from "@/lib/filters";

const SHORTCUTS: { label: string; period: () => PeriodFilter }[] = [
  { label: "Este mês", period: () => currentMonthPeriod() },
  {
    label: "Últimos 3 meses",
    period: () => rangeFromMonthsAgo(2),
  },
  {
    label: "Últimos 6 meses",
    period: () => rangeFromMonthsAgo(5),
  },
  {
    label: "Este ano",
    period: () => {
      const year = new Date().getFullYear();
      return { kind: "range", from: `${year}-01-01`, to: `${year}-12-31` };
    },
  },
];

function rangeFromMonthsAgo(monthsAgo: number): PeriodFilter {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { kind: "range", from: iso(from), to: iso(to) };
}

/**
 * Filtro global de período — Design System §6: mês anterior/próximo, mês/ano direto,
 * atalhos (Este mês, Últimos 3/6 meses, Este ano) e período personalizado.
 */
export function PeriodSelector() {
  const { period, setPeriod } = useFilters();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(period.kind === "range" ? period.from : "");
  const [customTo, setCustomTo] = useState(period.kind === "range" ? period.to : "");

  const isMonth = period.kind === "month";

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    setPeriod({ kind: "range", from: customFrom, to: customTo });
    setOpen(false);
  }

  function handleMonthInput(value: string) {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    setPeriod({ kind: "month", year, month });
  }

  return (
    <div className="flex items-center gap-0.5">
      {isMonth ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Mês anterior"
          onClick={() => setPeriod(shiftMonthPeriod(period, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 font-normal">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{formatPeriodLabel(period)}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Atalhos</p>
              <div className="flex flex-col gap-1">
                {SHORTCUTS.map((shortcut) => (
                  <Button
                    key={shortcut.label}
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => {
                      setPeriod(shortcut.period());
                      setOpen(false);
                    }}
                  >
                    {shortcut.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="period-month">
                Mês específico
              </label>
              <input
                id="period-month"
                type="month"
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={isMonth ? `${period.year}-${String(period.month).padStart(2, "0")}` : undefined}
                onChange={(e) => {
                  handleMonthInput(e.target.value);
                  setOpen(false);
                }}
              />
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Período personalizado</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="De"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="date"
                  aria-label="Até"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button
                size="sm"
                className="mt-2 w-full"
                disabled={!customFrom || !customTo}
                onClick={applyCustomRange}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isMonth ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Próximo mês"
          onClick={() => setPeriod(shiftMonthPeriod(period, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
