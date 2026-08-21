import { cn } from "@/lib/utils";
import { formatMoney, formatSignedMoney } from "@/lib/money";

/**
 * MoneyDisplay — Design System §56. Números tabulares (já configurado globalmente em
 * app/globals.css), cor semântica quando `signed`, mas sempre com o sinal por escrito
 * também (§27: "não depender apenas da cor").
 */
export function MoneyDisplay({
  amount,
  signed = false,
  className,
}: {
  amount: number;
  signed?: boolean;
  className?: string;
}) {
  if (!signed) {
    return <span className={className}>{formatMoney(amount)}</span>;
  }

  return (
    <span
      className={cn(
        amount > 0 && "text-positive",
        amount < 0 && "text-negative",
        className,
      )}
    >
      {formatSignedMoney(amount)}
    </span>
  );
}
