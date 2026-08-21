import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Private Financial Intelligence
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Sua vida financeira, finalmente clara.
        </h1>
        <p className="max-w-md text-base text-muted-foreground">
          Contas, cartões, orçamento e patrimônio em uma visão individual e
          familiar — o Financial Hub da sua família.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
