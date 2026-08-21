import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

/**
 * Camada "TENDÊNCIA" do dashboard (Prompt Mestre §16): compara o valor atual com o
 * período anterior. `higherIsBetter` decide a semântica de cor — receita/saldo/taxa de
 * poupança subindo é bom (verde), despesa subindo é ruim (vermelho) — mas o sinal e o
 * texto aparecem sempre, não só a cor (Design System §27).
 */
export function TrendIndicator({
  current,
  previous,
  higherIsBetter,
  unit = "money",
  label = "vs período anterior",
}: {
  current: number;
  previous: number;
  higherIsBetter: boolean;
  unit?: "money" | "points";
  label?: string;
}) {
  const delta = current - previous;
  const isFlat = Math.abs(delta) < (unit === "money" ? 0.005 : 0.05);
  const isUp = delta > 0;
  const sentimentPositive = isFlat ? null : isUp === higherIsBetter;

  const formattedDelta =
    unit === "money"
      ? `${isUp ? "+" : "−"} ${formatMoney(Math.abs(delta))}`
      : `${isUp ? "+" : "−"} ${Math.abs(delta).toFixed(1)} p.p.`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        sentimentPositive === true && "text-positive",
        sentimentPositive === false && "text-negative",
        sentimentPositive === null && "text-muted-foreground",
      )}
    >
      {isFlat ? <Minus className="size-3" /> : isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isFlat ? "estável" : formattedDelta}
      <span className="font-normal text-muted-foreground">{label}</span>
    </span>
  );
}
