import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso no servidor (Server Components, Server Actions, Route Handlers).
 * Utiliza apenas a anon key + sessão do usuário — RLS continua sendo a fronteira de segurança.
 * Nunca utilizar a service role key aqui a menos que a operação exija explicitamente
 * privilégio administrativo (ex.: jobs internos), e mesmo assim apenas em contexto server-only.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component — pode ser ignorado
            // se houver middleware atualizando a sessão.
          }
        },
      },
    },
  );
}
