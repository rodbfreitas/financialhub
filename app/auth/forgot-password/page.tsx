import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha — Financial Hub Familiar" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Redefinir senha"
      description="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
