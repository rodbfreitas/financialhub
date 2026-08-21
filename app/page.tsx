import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";

// A Application Shell (Etapa 5) ainda não existe — este é um placeholder mínimo pra
// "/" não ficar mostrando a landing de marketing pra quem já está logado. Quando a
// shell chegar, o branch autenticado daqui vira o dashboard de verdade.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: membership } = await supabase
      .from("household_members")
      .select("household:households(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Private Financial Intelligence
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Você está conectado{membership?.household ? ` — ${membership.household.name}` : ""}.
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            O painel financeiro ainda está sendo construído. Por enquanto, você pode
            gerenciar a segurança da sua conta.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg" variant="outline">
              <Link href="/account/security">Segurança da conta</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </div>
    );
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
