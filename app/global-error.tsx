"use client";

/**
 * Último nível de error boundary (Next.js App Router): só entra em ação se o próprio
 * `app/layout.tsx` (fontes, tema, Toaster) falhar ao renderizar — nesse caso ele
 * substitui até a tag `<html>`, então precisa declarar a própria estrutura HTML e não
 * pode depender de nenhum componente/context da árvore normal. Estilo inline de
 * propósito (não confia em Tailwind/CSS carregado, já que é o cenário de pior caso).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#F7F8FA",
          color: "#111827",
        }}
      >
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 4px" }}>Algo deu errado</h1>
          <p style={{ fontSize: "14px", color: "#6B7280", maxWidth: "360px", margin: 0 }}>
            Não conseguimos carregar o Financial Hub agora. Nada foi alterado — tente recarregar a página.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#146C5A",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
