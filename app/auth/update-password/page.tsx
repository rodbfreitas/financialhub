import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { FormAlert } from "@/components/auth/form-field-error";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nova senha — Financial Hub Familiar" };

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell
      title="Defina uma nova senha"
      description={user ? "Escolha uma senha nova para sua conta." : undefined}
    >
      {user ? (
        <UpdatePasswordForm />
      ) : (
        <>
          <FormAlert>
            Este link de redefinição é inválido ou expirou.
          </FormAlert>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Solicitar um novo link
          </Link>
        </>
      )}
    </AuthShell>
  );
}
