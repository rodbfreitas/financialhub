"use client";

import { Users, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFilters } from "@/components/shell/filters-context";

/**
 * Filtro global de perfil — Design System §5: "Todos" + um item por profiles ativo do
 * household (individuais e o compartilhado). Nada de nomes fixos — os perfis vêm do
 * banco (populados na Etapa 6); enquanto não existir nenhum, só "Todos" aparece.
 */
export function ProfileSelector() {
  const { profiles, profileId, setProfileId } = useFilters();

  const activeLabel =
    profileId === "all" ? "Todos" : (profiles.find((p) => p.id === profileId)?.name ?? "Todos");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 font-normal">
          <Users className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Perfil:</span>
          <span className="font-medium">{activeLabel}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>Filtrar por perfil</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={profileId} onValueChange={setProfileId}>
          <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
          {profiles.length > 0 ? <DropdownMenuSeparator /> : null}
          {profiles.map((profile) => (
            <DropdownMenuRadioItem key={profile.id} value={profile.id} className="gap-2">
              <User className="size-3.5 text-muted-foreground" />
              {profile.name}
              {profile.type === "shared" ? (
                <span className="ml-auto text-xs text-muted-foreground">Compartilhado</span>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {profiles.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Nenhum perfil cadastrado ainda.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
