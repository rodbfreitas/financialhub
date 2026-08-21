import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza a sessão Supabase a cada requisição e protege rotas autenticadas.
 * Usado pelo proxy.ts na raiz do projeto (Next.js 16 renomeou middleware → proxy;
 * ver AGENTS.md / node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
 *
 * Isto é uma checagem otimista — getUser() revalida o JWT contra o Supabase Auth a
 * cada request (não confia só no cookie local), mas RLS continua sendo a fronteira
 * real de segurança para dados; isto só evita que uma página protegida chegue a
 * renderizar sem sessão.
 *
 * AAL2 (MFA) não é imposto aqui globalmente, por design — Prompt Mestre §32 pede que
 * operações altamente sensíveis *possam* exigir aal2, não a aplicação inteira. O
 * desafio de MFA acontece inline no fluxo de login, antes do redirect para dentro do
 * app.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // /auth/* fica de fora de ambos: confirmação de e-mail e reset de senha precisam
  // ser acessíveis tanto por visitantes (link de e-mail) quanto por quem já tem
  // sessão (ex.: trocar a senha estando logado).
  const isAuthCallbackRoute = pathname.startsWith("/auth");
  const isLoggedOutOnlyRoute = pathname === "/login" || pathname === "/signup";
  const isPublicRoute = pathname === "/" || isAuthCallbackRoute || isLoggedOutOnlyRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Usuário já logado tentando ver /login ou /signup: manda pro fluxo pós-login em
  // vez de deixar ele preencher o formulário de novo. /onboarding decide se ele já
  // tem household (manda pra /) ou ainda precisa finalizar o convite/bootstrap.
  if (user && isLoggedOutOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
