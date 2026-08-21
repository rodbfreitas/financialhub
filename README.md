# Financial Hub Familiar

> Sua vida financeira, finalmente clara.

Plataforma privada de gestão financeira pessoal e familiar. Centraliza receitas,
despesas, contas, cartões, faturas, parcelamentos, assinaturas, orçamento, metas
e patrimônio — com visão individual, compartilhada e consolidada.

Este repositório é construído a partir de quatro documentos soberanos do
projeto (mantidos no Financial Hub — Claude Project): PRD v1.0, Arquitetura
Técnica & ERD v1.0, Design System & UX/UI v1.0 e o Prompt Mestre de
Desenvolvimento. Em caso de dúvida sobre um requisito, esses documentos são a
fonte da verdade — não este README.

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript
- **UI:** Tailwind CSS v4 · componentes no padrão shadcn/ui (escritos localmente
  — ver nota abaixo) · Lucide Icons · Recharts
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Hosting:** Vercel
- **Repositório:** GitHub
- **Open Finance (Fase 2):** Pluggy, por trás de uma camada `FinancialDataProvider`

> **Nota sobre shadcn/ui:** o sandbox de desenvolvimento usado para o scaffold
> inicial não tem acesso de rede a `ui.shadcn.com`, então os componentes em
> `components/ui/` foram escritos manualmente seguindo exatamente os mesmos
> padrões (Radix primitives + `class-variance-authority` + `cn()`) em vez de
> gerados pela CLI. O resultado é equivalente; a CLI (`npx shadcn add ...`)
> pode ser usada normalmente em qualquer ambiente com acesso a esse domínio.

## Estrutura do projeto

```
financial-hub/
├── app/                  # Rotas (App Router)
├── components/
│   ├── ui/               # Primitivos (padrão shadcn/ui)
│   ├── layout/           # Sidebar, TopBar, navegação
│   ├── dashboard/        # MetricCard, InsightCard, etc.
│   ├── transactions/     # TransactionTable, TransactionDrawer, TransactionForm
│   ├── charts/           # Wrappers Recharts
│   └── forms/
├── lib/
│   ├── supabase/         # Clients (browser/server/middleware)
│   ├── finance/          # Regras de negócio financeiras
│   ├── imports/          # Parsers e pipeline de importação
│   ├── security/         # Helpers de autorização
│   └── integrations/     # FinancialDataProvider (Pluggy e futuros)
├── actions/               # Server Actions
├── types/                 # Tipos compartilhados (incl. types/database.ts gerado)
├── supabase/
│   ├── migrations/        # Migrations versionadas (fonte da verdade do schema)
│   ├── seed.sql            # Dados fictícios de desenvolvimento
│   └── functions/
└── tests/
```

## Setup

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do projeto Supabase
npm run dev
```

## Variáveis de ambiente

Ver `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `PLUGGY_CLIENT_SECRET` e
`AI_API_KEY` nunca devem ser expostas ao browser nem commitadas — em produção
vivem apenas nas Environment Variables da Vercel.

## Migrations

O schema é versionado em `supabase/migrations/`. Nunca alterar o banco de
produção manualmente — toda mudança de schema é um novo arquivo de migration.

## Desenvolvimento

```bash
npm run lint       # ESLint
npx tsc --noEmit   # Typecheck
npm run build      # Build de produção
```

## Testes

```bash
npm test
```

## Deploy

GitHub → Vercel (build automático). Ambientes: `development` e `production`,
com banco e secrets próprios em cada Supabase project.

## Status de implementação

Ver o board de tarefas do projeto para o estado atual de cada etapa (0–13).
Este README será mantido honesto sobre o que está **implementado**, **testado**
e **publicado** — nunca descrevendo como pronto algo que ainda não está.
