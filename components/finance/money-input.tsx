import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de valor monetário — texto livre (aceita "1234,56" ou "1234.56"), parseado no
 * schema Zod da action com `moneySchema` (lib/validations/money.ts). Não usa
 * <input type="number"> porque o comportamento de locale varia entre navegadores.
 */
export function MoneyInput({
  id,
  name,
  defaultValue,
  placeholder = "0,00",
  className,
  "aria-invalid": ariaInvalid,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        className="pl-9 text-right tabular-nums"
      />
    </div>
  );
}
