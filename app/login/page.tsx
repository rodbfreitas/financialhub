import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar — Financial Hub Familiar" };

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;

  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Entre com sua conta para continuar."
      footer={
        <>
          Não tem uma conta?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
