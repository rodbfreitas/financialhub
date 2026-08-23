import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Landmark,
  CreditCard,
  Repeat,
  Target,
  PiggyBank,
  Wallet,
  TrendingUp,
  FileBarChart,
  Upload,
  FileScan,
  Plug,
  Settings,
} from "lucide-react";

export type NavLeaf = { label: string; href: string; icon?: LucideIcon };
export type NavGroup = { label: string; icon: LucideIcon; children: NavLeaf[] };
export type NavItem = NavLeaf | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

/**
 * Menu principal — PRD §50 / Design System §4, na ordem exata dos documentos:
 * Visão Geral, Movimentações (Transações/Contas/Cartões/Assinaturas), Planejamento
 * (Orçamento/Metas), Análises (Relatórios/Patrimônio), Documentos (Fase 2 —
 * evolução do antigo "Importar", que continua disponível como filho — UX 2.0
 * §"arquitetura de informação": reaproveita o nav existente, não cria produto
 * paralelo), Integrações, Configurações.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Movimentações",
    icon: ArrowLeftRight,
    children: [
      { label: "Transações", href: "/transacoes", icon: Receipt },
      { label: "Contas", href: "/contas", icon: Landmark },
      { label: "Cartões", href: "/cartoes", icon: CreditCard },
      { label: "Assinaturas", href: "/assinaturas", icon: Repeat },
    ],
  },
  {
    label: "Planejamento",
    icon: Target,
    children: [
      { label: "Orçamento", href: "/planejamento/orcamento", icon: PiggyBank },
      { label: "Metas", href: "/planejamento/metas", icon: Target },
    ],
  },
  {
    label: "Análises",
    icon: TrendingUp,
    children: [
      { label: "Relatórios", href: "/analises/relatorios", icon: FileBarChart },
      { label: "Patrimônio", href: "/analises/patrimonio", icon: Wallet },
    ],
  },
  {
    label: "Documentos",
    icon: Upload,
    children: [
      { label: "Enviar documentos", href: "/documentos", icon: FileScan },
      { label: "Importações (CSV/XLSX/OFX)", href: "/importar", icon: Upload },
    ],
  },
  { label: "Integrações", href: "/integracoes", icon: Plug },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

/** Atalhos fixos da bottom navigation mobile — Design System §48. */
export const MOBILE_BOTTOM_NAV: NavLeaf[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Movimentações", href: "/transacoes", icon: ArrowLeftRight },
  { label: "Planejamento", href: "/planejamento/orcamento", icon: Target },
];

/** Seções de Configurações — Design System §50. */
export const SETTINGS_SECTIONS: {
  label: string;
  href: string;
  description: string;
  external?: boolean;
}[] = [
  { label: "Conta", href: "/configuracoes/conta", description: "Seus dados de login e perfil." },
  { label: "Segurança", href: "/configuracoes/seguranca", description: "Senha e verificação em duas etapas (MFA)." },
  { label: "Household", href: "/configuracoes/household", description: "Nome da família e membros." },
  { label: "Perfis", href: "/configuracoes/perfis", description: "Perfis financeiros (individuais e compartilhado)." },
  { label: "Categorias", href: "/configuracoes/categorias", description: "Categorias e subcategorias de transações." },
  { label: "Contas", href: "/contas", description: "Contas bancárias e carteiras — mesma tela do menu principal.", external: true },
  { label: "Integrações", href: "/integracoes", description: "Open Finance e conexões bancárias — mesma tela do menu principal.", external: true },
  { label: "Importação", href: "/importar", description: "Importar extratos e faturas — mesma tela do menu principal.", external: true },
  { label: "Preferências", href: "/configuracoes/preferencias", description: "Idioma, moeda e formato de exibição." },
  { label: "Dados e privacidade", href: "/configuracoes/dados-e-privacidade", description: "Exportação e exclusão de dados (LGPD)." },
];
