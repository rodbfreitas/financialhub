import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback único pra todos os links de e-mail do Supabase Auth (confirmação de
 * cadastro, recuperação de senha) — o `type` no link diz qual OTP está sendo
 * verificado. Depois de trocar o token por uma sessão, manda pra `next` (definido
 * em emailRedirectTo/redirectTo na hora de disparar o e-mail nas actions).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Link inválido ou expirado. Tente novamente.")}`,
  );
}
