"use client";

import Link from "next/link";
import { LogOut, Settings, CircleHelp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";

/**
 * Menu do usuário logado — identifica quem está logado (nome + e-mail) e dá acesso
 * rápido a "Configurações da conta", "Ajuda" (manual + FAQ) e "Sair" a partir de
 * qualquer tela, na topbar (desktop) e no header mobile. Antes disso a única pista de
 * quem estava logado era o rodapé da sidebar (sem opção de sair ali), o que
 * dificultava identificar a conta ativa — especialmente relevante num app de uso
 * familiar/compartilhado.
 */
export function UserMenu({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 font-normal">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="max-w-32 truncate font-medium">{userName}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{userName}</span>
          <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/configuracoes/conta">
            <Settings className="size-4 text-muted-foreground" />
            Configurações da conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/ajuda">
            <CircleHelp className="size-4 text-muted-foreground" />
            Ajuda
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
