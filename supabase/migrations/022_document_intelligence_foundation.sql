-- 022: Financial Document Intelligence — Fase 2, Macrofase 1 (Foundation)
-- Fonte: ERD & Arquitetura 2.0 — Document Intelligence (§ tabelas novas) / PRD 2.0 /
-- Prompt Mestre Fase 2 §5 e §21 (macrofase 1: schema + RLS + storage metadata).
--
-- Princípio inegociável (Prompt Mestre §5 / ERD §30): documento ≠ transação. IA/OCR/
-- parser nunca escreve diretamente em `transactions` — apenas confirma humano, pelo
-- fluxo já existente de staging (import_rows) → confirmação. As tabelas abaixo
-- implementam as camadas Original → Interpretado → Confirmado, mantidas sempre
-- distintas e auditáveis (nunca colapsadas).
--
-- Reuso deliberado do que já existe (ADR implícito desta migration, documentado
-- porque altera decisão do ERD apenas na forma, não na substância):
--   - Bucket `financial-documents` (014_storage.sql) já é privado e as policies já
--     autorizam por household_id extraído do primeiro segmento do path — não é
--     preciso criar bucket novo nem policy nova de Storage. Os novos documentos usam
--     o mesmo bucket, path `{household_id}/documents/{document_id}/{filename}`.
--   - `is_household_member()` (011_auth_functions.sql) é reaproveitada em todas as
--     policies novas, sem duplicar lógica de autorização.
--   - `imports`/`import_rows` continuam sendo o staging final antes de `transactions`
--     (não são substituídas). `financial_documents.import_id` é opcional e só é usado
--     quando um documento processado é efetivamente materializado como lote de import.

-- ── Enums ────────────────────────────────────────────────────────────────────

create type document_type as enum (
  'fatura_cartao',
  'extrato_bancario',
  'boleto',
  'comprovante_pagamento',
  'comprovante_pix',
  'comprovante_transferencia',
  'documento_bancario_generico',
  'documento_desconhecido'
);

-- Estados do documento em si (visão do usuário — Inbox). Distinto do estado de cada
-- *execução* de processamento (document_processing_run_status), pois um documento
-- pode ser reprocessado (nova run) sem perder o histórico da run anterior.
create type financial_document_status as enum (
  'received',
  'processing',
  'ready_for_review',
  'reviewed',
  'partial',
  'failed',
  'archived'
);

create type document_processing_run_status as enum (
  'queued',
  'running',
  'succeeded',
  'partial',
  'failed',
  'cancelled'
);

create type extracted_entity_type as enum (
  'institution',
  'merchant',
  'person',
  'account',
  'credit_card',
  'bill',
  'boleto',
  'identifier'
);

create type financial_event_type as enum (
  'purchase',
  'income',
  'payment',
  'transfer',
  'pix_sent',
  'pix_received',
  'boleto_payment',
  'card_payment',
  'refund',
  'fee',
  'interest',
  'penalty',
  'yield',
  'withdrawal',
  'deposit',
  'installment',
  'direct_debit',
  'unknown'
);

-- Tipos de relação de reconciliação (PRD 2.0 / ERD 2.0). Nunca colapsar registros
-- por valor isolado — o `relation_type` explica *por que* dois eventos se relacionam.
create type reconciliation_relation_type as enum (
  'DUPLICATE',
  'RELATED',
  'SETTLEMENT',
  'TRANSFER_PAIR',
  'REFUND',
  'INSTALLMENT',
  'BILL_PAYMENT'
);

create type reconciliation_candidate_status as enum (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

-- ── financial_documents ──────────────────────────────────────────────────────
-- Evidência enviada pelo usuário. Um documento pode gerar zero, um ou vários
-- eventos financeiros (extracted_financial_events); nunca é, em si, uma transação.

create table financial_documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  import_id uuid references imports(id) on delete set null,
  storage_bucket text not null default 'financial-documents',
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  sha256 text not null,
  document_type document_type not null default 'documento_desconhecido',
  institution_name text,
  profile_id uuid references profiles(id) on delete set null,
  status financial_document_status not null default 'received',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotência por hash (PRD 2.0 / UX "Mesmo documento reenviado"): o mesmo arquivo
-- enviado de novo no mesmo household aponta para o MESMO registro de
-- financial_documents — "reprocessar" cria uma nova run sobre o documento existente,
-- nunca duplica o documento. É uma decisão de implementação explícita (não estava
-- fixada em um valor único no ERD) e está documentada aqui, não alterada em silêncio.
create unique index uq_financial_documents_household_sha256 on financial_documents(household_id, sha256);

create index idx_financial_documents_household on financial_documents(household_id);
create index idx_financial_documents_import on financial_documents(import_id);
create index idx_financial_documents_profile on financial_documents(profile_id);
create index idx_financial_documents_status on financial_documents(household_id, status);

-- ── document_processing_runs ────────────────────────────────────────────────
-- Uma execução (assíncrona) do pipeline de extração+interpretação sobre um
-- documento. Reprocessar = nova run, nunca sobrescreve a anterior (auditabilidade).

create table document_processing_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references financial_documents(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  run_number int not null default 1,
  status document_processing_run_status not null default 'queued',
  pipeline_version text not null default 'v1',
  extractor_provider text,
  extractor_model text,
  interpreter_provider text,
  interpreter_model text,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_detail jsonb,
  metrics jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, run_number)
);

create index idx_document_processing_runs_document on document_processing_runs(document_id);
create index idx_document_processing_runs_household on document_processing_runs(household_id, status);

-- ── document_pages ───────────────────────────────────────────────────────────
-- Só é populada quando o documento é paginado (PDF multipágina); imagens/CSV não
-- precisam. `raw_text` guarda o texto bruto extraído da página — nunca conteúdo
-- interpretado (isso vai em processing_artifacts / extracted_financial_events).

create table document_pages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references document_processing_runs(id) on delete cascade,
  page_number int not null,
  width int,
  height int,
  raw_text text,
  created_at timestamptz not null default now(),
  unique (run_id, page_number)
);

create index idx_document_pages_run on document_pages(run_id);

-- ── processing_artifacts ─────────────────────────────────────────────────────
-- Saídas intermediárias do pipeline (layout, tabelas detectadas, classificação,
-- resposta bruta do provider) — nunca expostas na UI principal (ERD/UX: não vazar
-- payload técnico no fluxo comum), usadas para depuração/observabilidade/reprocesso.

create table processing_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references document_processing_runs(id) on delete cascade,
  artifact_type text not null,
  content jsonb,
  storage_path text,
  created_at timestamptz not null default now()
);

create index idx_processing_artifacts_run on processing_artifacts(run_id, artifact_type);

-- ── extracted_entities ───────────────────────────────────────────────────────
-- Entidades brutas identificadas no documento (instituição, merchant, pessoa,
-- conta, cartão, boleto, identificador) — camada "Original", antes de qualquer
-- resolução/normalização de negócio (isso é papel do EntityResolver, não daqui).

create table extracted_entities (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references document_processing_runs(id) on delete cascade,
  document_id uuid not null references financial_documents(id) on delete cascade,
  entity_type extracted_entity_type not null,
  raw_value text not null,
  normalized_value text,
  confidence numeric(4,3),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_extracted_entities_run on extracted_entities(run_id);
create index idx_extracted_entities_document on extracted_entities(document_id, entity_type);

-- ── extracted_financial_events ──────────────────────────────────────────────
-- Camada "Original": o evento exatamente como o extractor leu (texto bruto +
-- melhor parse possível), imutável após criado. A interpretação de negócio vive
-- em interpreted_financial_events, nunca sobrescrevendo isto.

create table extracted_financial_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references document_processing_runs(id) on delete cascade,
  document_id uuid not null references financial_documents(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  source_event_index int not null,
  raw_description text,
  raw_date text,
  raw_amount text,
  parsed_date date,
  parsed_amount numeric(15,2),
  direction text,
  source_page int,
  source_bbox jsonb,
  extraction_confidence numeric(4,3),
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_extracted_financial_events_run on extracted_financial_events(run_id);
create index idx_extracted_financial_events_document on extracted_financial_events(document_id);
create index idx_extracted_financial_events_household on extracted_financial_events(household_id);

-- ── interpreted_financial_events ────────────────────────────────────────────
-- Camada "Interpretado": leitura de negócio sobre um extracted_financial_event
-- (tipo de evento, sugestões de perfil/conta/cartão/categoria, valor/data efetivos,
-- parcelamento). `interpretation_version`/`is_current` preservam histórico — uma
-- reinterpretação nunca apaga a anterior (ERD §30: não descartar o original ao
-- manter só o interpretado — aqui o "original" do interpretado é a própria versão
-- anterior, além do extracted_financial_event de origem).

create table interpreted_financial_events (
  id uuid primary key default gen_random_uuid(),
  extracted_event_id uuid not null references extracted_financial_events(id) on delete cascade,
  interpretation_version int not null default 1,
  event_type financial_event_type not null default 'unknown',
  profile_id_suggested uuid references profiles(id) on delete set null,
  account_id_suggested uuid references accounts(id) on delete set null,
  credit_card_id_suggested uuid references credit_cards(id) on delete set null,
  category_id_suggested uuid references categories(id) on delete set null,
  subcategory_id_suggested uuid references subcategories(id) on delete set null,
  merchant_normalized text,
  effective_date date,
  amount numeric(15,2),
  installment_current int,
  installment_total int,
  interpretation_confidence numeric(4,3),
  reason_codes jsonb,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (extracted_event_id, interpretation_version)
);

create index idx_interpreted_financial_events_extracted on interpreted_financial_events(extracted_event_id);
create index idx_interpreted_financial_events_current
  on interpreted_financial_events(extracted_event_id)
  where is_current;

-- ── document_event_evidence ─────────────────────────────────────────────────
-- Liga um evento interpretado a TODOS os documentos que o evidenciam (um evento
-- pode ter múltiplas evidências: boleto + comprovante + extrato, por exemplo).

create table document_event_evidence (
  id uuid primary key default gen_random_uuid(),
  interpreted_event_id uuid not null references interpreted_financial_events(id) on delete cascade,
  document_id uuid not null references financial_documents(id) on delete cascade,
  role text not null default 'primary',
  created_at timestamptz not null default now(),
  unique (interpreted_event_id, document_id)
);

create index idx_document_event_evidence_document on document_event_evidence(document_id);

-- ── reconciliation_candidates ───────────────────────────────────────────────
-- Saída do ReconciliationEngine: candidatos a relação entre um evento interpretado
-- e outra entidade (transação existente ou outro evento interpretado), com score
-- versionado. Nunca decide sozinho — status só sai de 'pending' por decisão humana
-- (ReviewService), exceto expiração automática.

create table reconciliation_candidates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  interpreted_event_id uuid not null references interpreted_financial_events(id) on delete cascade,
  candidate_type text not null,
  candidate_id uuid not null,
  relation_type_suggested reconciliation_relation_type not null,
  score numeric(4,3) not null,
  score_version int not null default 1,
  evidence jsonb,
  status reconciliation_candidate_status not null default 'pending',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_reconciliation_candidates_household on reconciliation_candidates(household_id, status);
create index idx_reconciliation_candidates_event on reconciliation_candidates(interpreted_event_id);
create index idx_reconciliation_candidates_candidate on reconciliation_candidates(candidate_type, candidate_id);

-- ── financial_event_relations ───────────────────────────────────────────────
-- Relação CONFIRMADA (pós-revisão humana) entre duas entidades financeiras —
-- distinta de reconciliation_candidates, que é só sugestão. Fonte de verdade para
-- "este boleto foi pago por este comprovante", "esta fatura foi quitada por este
-- pagamento", etc.

create table financial_event_relations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  relation_type reconciliation_relation_type not null,
  source_entity_type text not null,
  source_entity_id uuid not null,
  target_entity_type text not null,
  target_entity_id uuid not null,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_financial_event_relations_household on financial_event_relations(household_id);
create index idx_financial_event_relations_source on financial_event_relations(source_entity_type, source_entity_id);
create index idx_financial_event_relations_target on financial_event_relations(target_entity_type, target_entity_id);

-- ── transaction_evidence_links ──────────────────────────────────────────────
-- Camada "Confirmado": liga uma transação real (já em `transactions`) ao(s)
-- documento(s) que a evidenciam. É o único ponto em que o mundo documental toca
-- o ledger oficial — e só existe depois de confirmação humana via ImportMaterializer.

create table transaction_evidence_links (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  document_id uuid not null references financial_documents(id) on delete cascade,
  interpreted_event_id uuid references interpreted_financial_events(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (transaction_id, document_id)
);

create index idx_transaction_evidence_links_transaction on transaction_evidence_links(transaction_id);
create index idx_transaction_evidence_links_document on transaction_evidence_links(document_id);

-- ── document_review_decisions ───────────────────────────────────────────────
-- Trilha de auditoria de toda decisão humana tomada na Fila de Revisão (DOC-05/06):
-- confirmar/rejeitar candidato, editar evento, ignorar, adiar. Nunca sobrescrita —
-- histórico completo de "quem decidiu o quê", exigido por ERD §30 (reversibilidade)
-- e pelo princípio de confiabilidade do ledger.

create table document_review_decisions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  document_id uuid references financial_documents(id) on delete set null,
  interpreted_event_id uuid references interpreted_financial_events(id) on delete set null,
  reconciliation_candidate_id uuid references reconciliation_candidates(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decision_action text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_document_review_decisions_household on document_review_decisions(household_id, created_at desc);
create index idx_document_review_decisions_document on document_review_decisions(document_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Mesmo padrão de 012_rls_policies.sql: tabelas com household_id direto usam
-- is_household_member(household_id); tabelas sem household_id direto isolam via
-- subquery na tabela pai. Nenhuma tabela nova fica sem RLS habilitada.

do $$
declare
  t text;
begin
  foreach t in array array[
    'financial_documents', 'document_processing_runs', 'extracted_financial_events',
    'reconciliation_candidates', 'financial_event_relations', 'document_review_decisions'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (is_household_member(household_id)) with check (is_household_member(household_id))',
      t || '_household_isolation', t
    );
  end loop;
end $$;

alter table document_pages enable row level security;
create policy document_pages_isolation on document_pages for all
  using (exists (
    select 1 from document_processing_runs r
    where r.id = document_pages.run_id and is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from document_processing_runs r
    where r.id = document_pages.run_id and is_household_member(r.household_id)
  ));

alter table processing_artifacts enable row level security;
create policy processing_artifacts_isolation on processing_artifacts for all
  using (exists (
    select 1 from document_processing_runs r
    where r.id = processing_artifacts.run_id and is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from document_processing_runs r
    where r.id = processing_artifacts.run_id and is_household_member(r.household_id)
  ));

alter table extracted_entities enable row level security;
create policy extracted_entities_isolation on extracted_entities for all
  using (exists (
    select 1 from document_processing_runs r
    where r.id = extracted_entities.run_id and is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from document_processing_runs r
    where r.id = extracted_entities.run_id and is_household_member(r.household_id)
  ));

alter table interpreted_financial_events enable row level security;
create policy interpreted_financial_events_isolation on interpreted_financial_events for all
  using (exists (
    select 1 from extracted_financial_events e
    where e.id = interpreted_financial_events.extracted_event_id and is_household_member(e.household_id)
  ))
  with check (exists (
    select 1 from extracted_financial_events e
    where e.id = interpreted_financial_events.extracted_event_id and is_household_member(e.household_id)
  ));

alter table document_event_evidence enable row level security;
create policy document_event_evidence_isolation on document_event_evidence for all
  using (exists (
    select 1 from financial_documents d
    where d.id = document_event_evidence.document_id and is_household_member(d.household_id)
  ))
  with check (exists (
    select 1 from financial_documents d
    where d.id = document_event_evidence.document_id and is_household_member(d.household_id)
  ));

alter table transaction_evidence_links enable row level security;
create policy transaction_evidence_links_isolation on transaction_evidence_links for all
  using (exists (
    select 1 from transactions t
    where t.id = transaction_evidence_links.transaction_id and is_household_member(t.household_id)
  ))
  with check (exists (
    select 1 from transactions t
    where t.id = transaction_evidence_links.transaction_id and is_household_member(t.household_id)
  ));
