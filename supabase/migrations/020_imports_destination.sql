-- 020: imports — destino (conta/cartão) e metadados de mapeamento de colunas
-- Fonte: Etapa 9 (Prompt Mestre) / PRD §23-24. O ERD original (§36) não previu onde
-- guardar a conta/cartão de destino de um lote de importação nem o mapeamento de
-- colunas escolhido pelo usuário quando o CSV/XLSX não tem cabeçalhos reconhecíveis
-- (PRD §24: "O usuário confirma antes da importação"). São extensões genuínas do
-- schema (não um atalho) — toda transação real precisa de account_id OU
-- credit_card_id, e um extrato bancário importado é sempre de UMA conta/cartão só.

alter table imports
  add column account_id uuid references accounts(id) on delete set null,
  add column credit_card_id uuid references credit_cards(id) on delete set null,
  add column raw_headers jsonb,
  add column column_mapping jsonb;

create index idx_imports_account on imports(account_id);
create index idx_imports_credit_card on imports(credit_card_id);
