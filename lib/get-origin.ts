import { headers } from "next/headers";

/**
 * Origin absoluta da requisição atual, usada para montar redirectTo/emailRedirectTo
 * do Supabase Auth (confirmação de e-mail, recuperação de senha). Deriva dos headers
 * em vez de uma env var fixa: funciona igual em produção, previews da Vercel e
 * localhost, sem precisar configurar nada por ambiente.
 */
export async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
