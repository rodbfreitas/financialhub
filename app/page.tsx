import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// "/" é só a landing de marketing pra visitante deslogado — quem já tem sessão vai
// direto pro dashboard de verdade dentro da Application Shell (Etapa 5).
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

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
