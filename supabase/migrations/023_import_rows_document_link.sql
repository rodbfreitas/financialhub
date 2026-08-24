-- Fase 2 — Macrofase 9 (Materialização de import / ImportMaterializer, ERD 2.0 §18/§20).
-- Liga um `import_rows` a um `interpreted_financial_events` quando ele nasceu de um
-- evento de documento aceito na fila de revisão (Macrofase 8), em vez de um arquivo
-- CSV/XLSX/OFX (Etapa 9, Fase 1). Aditivo e opcional — nunca quebra o fluxo existente
-- de import manual, que continua com esta coluna sempre null.
--
-- Idempotência (ERD 2.0 §18: "criação de import_rows deve possuir chave idempotente
-- por evento/run"): unique constraint numa coluna nullable só restringe os valores
-- não-nulos (Postgres permite múltiplos NULL), então um evento aceito duas vezes
-- (duplo clique, retry) nunca gera um segundo import_row — o materializer sempre
-- confere esta coluna antes de inserir (nunca confia só no constraint pra evitar
-- duplicidade, mas ele é a rede de segurança final).
alter table import_rows
  add column interpreted_event_id uuid references interpreted_financial_events(id) on delete set null;

alter table import_rows
  add constraint uq_import_rows_interpreted_event unique (interpreted_event_id);

create index idx_import_rows_interpreted_event on import_rows(interpreted_event_id) where interpreted_event_id is not null;
