-- Fase 2 — Macrofase 11 (Hardening, Prompt Mestre §21 "Hardening/performance").
-- Corrige o único achado WARN do Performance Advisor no schema inteiro (INFO-level
-- de FK sem índice e de índice não usado ficam fora de escopo aqui — tabelas
-- escopadas por household num app familiar não têm volume que justifique, e
-- adicionar índice é sempre reversível/seguro de fazer depois, sob demanda real).
--
-- `households.household_insert` chamava `auth.uid()` "solto" no WITH CHECK — o
-- Postgres reavalia isso LINHA A LINHA em vez de uma vez só por statement. Em
-- insert de household isso não importa na prática (sempre uma linha), mas é o
-- padrão recomendado pelo próprio Supabase e o único lugar do schema que não
-- seguia — as outras ~15 políticas que usam auth.uid()/is_household_member() já
-- foram escritas com `(select ...)` desde a Fase 1. Puramente sobre plano de
-- execução: o resultado autorizado/negado é idêntico, nada de segurança muda.
alter policy household_insert on households
  with check ((select auth.uid()) is not null);
