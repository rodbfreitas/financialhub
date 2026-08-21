-- 014: Storage — bucket privado para documentos financeiros
-- Fonte: ERD §50-51 / PRD §40. Nunca bucket público; acesso via signed URL; policy
-- valida Household Membership a partir do primeiro segmento do path: {household_id}/...

insert into storage.buckets (id, name, public)
values ('financial-documents', 'financial-documents', false)
on conflict (id) do nothing;

create policy "financial_documents_select" on storage.objects for select
  using (
    bucket_id = 'financial-documents'
    and is_household_member((storage.foldername(name))[1]::uuid)
  );

create policy "financial_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'financial-documents'
    and is_household_member((storage.foldername(name))[1]::uuid)
  );

create policy "financial_documents_update" on storage.objects for update
  using (
    bucket_id = 'financial-documents'
    and is_household_member((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'financial-documents'
    and is_household_member((storage.foldername(name))[1]::uuid)
  );

create policy "financial_documents_delete" on storage.objects for delete
  using (
    bucket_id = 'financial-documents'
    and is_household_member((storage.foldername(name))[1]::uuid)
  );
