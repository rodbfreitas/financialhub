"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  PROFILE_COOKIE,
  PERIOD_COOKIE,
  serializePeriodCookie,
  type PeriodFilter,
  type ProfileFilter,
} from "@/lib/filters";

export type ShellProfile = { id: string; name: string; type: "individual" | "shared" };

type FiltersContextValue = {
  profiles: ShellProfile[];
  profileId: ProfileFilter;
  setProfileId: (id: ProfileFilter) => void;
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Estado do filtro global de perfil/período (Design System §5-6): inicializado no
 * server (cookies lidos em app/(app)/layout.tsx) e mantido em memória aqui — cada
 * mudança também grava o cookie, pra sobreviver a um reload ou nova aba sem exigir
 * que toda navegação vá através de query params.
 */
export function FiltersProvider({
  profiles,
  initialProfileId,
  initialPeriod,
  children,
}: {
  profiles: ShellProfile[];
  initialProfileId: ProfileFilter;
  initialPeriod: PeriodFilter;
  children: ReactNode;
}) {
  const [profileId, setProfileIdState] = useState<ProfileFilter>(initialProfileId);
  const [period, setPeriodState] = useState<PeriodFilter>(initialPeriod);

  const setProfileId = useCallback((id: ProfileFilter) => {
    setProfileIdState(id);
    document.cookie = `${PROFILE_COOKIE}=${id}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }, []);

  const setPeriod = useCallback((next: PeriodFilter) => {
    setPeriodState(next);
    document.cookie = `${PERIOD_COOKIE}=${serializePeriodCookie(next)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }, []);

  return (
    <FiltersContext.Provider value={{ profiles, profileId, setProfileId, period, setPeriod }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters precisa estar dentro de FiltersProvider");
  return ctx;
}
