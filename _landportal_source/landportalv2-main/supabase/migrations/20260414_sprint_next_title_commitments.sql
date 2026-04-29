begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create table if not exists public.title_commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parcel_snapshot_id uuid references public.parcel_snapshots(id) on delete set null,
  primary_document_id uuid references public.project_documents(id) on delete set null,
  title text not null,
  commitment_number text,
  effective_date date,
  issuing_company text,
  status text not null default 'draft',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_documents
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists parent_document_id uuid references public.project_documents(id) on delete set null,
  add column if not exists document_role text not null default 'supporting',
  add column if not exists external_reference text;

create table if not exists public.title_commitment_document_links (
  id uuid primary key default gen_random_uuid(),
  title_commitment_id uuid not null references public.title_commitments(id) on delete cascade,
  project_document_id uuid not null references public.project_documents(id) on delete cascade,
  relation_type text not null default 'supporting_record',
  source_reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (title_commitment_id, project_document_id)
);

create index if not exists idx_title_commitments_project_id
  on public.title_commitments(project_id);

create index if not exists idx_title_commitment_document_links_commitment_id
  on public.title_commitment_document_links(title_commitment_id);

drop trigger if exists title_commitments_set_updated_at on public.title_commitments;
create trigger title_commitments_set_updated_at
before update on public.title_commitments
for each row execute procedure public.set_updated_at();

alter table public.title_commitments enable row level security;
alter table public.title_commitment_document_links enable row level security;

drop policy if exists "title_commitments_select_current_workspace" on public.title_commitments;
create policy "title_commitments_select_current_workspace"
on public.title_commitments
for select
using (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
  )
);

drop policy if exists "title_commitments_insert_admin_editor" on public.title_commitments;
create policy "title_commitments_insert_admin_editor"
on public.title_commitments
for insert
with check (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "title_commitments_update_admin_editor" on public.title_commitments;
create policy "title_commitments_update_admin_editor"
on public.title_commitments
for update
using (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
)
with check (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "title_commitment_document_links_select_current_workspace" on public.title_commitment_document_links;
create policy "title_commitment_document_links_select_current_workspace"
on public.title_commitment_document_links
for select
using (
  title_commitment_id in (
    select id
    from public.title_commitments
    where project_id in (
      select id
      from public.projects
      where workspace_id = public.current_workspace_id()
    )
  )
);

drop policy if exists "title_commitment_document_links_insert_admin_editor" on public.title_commitment_document_links;
create policy "title_commitment_document_links_insert_admin_editor"
on public.title_commitment_document_links
for insert
with check (
  title_commitment_id in (
    select id
    from public.title_commitments
    where project_id in (
      select id
      from public.projects
      where workspace_id = public.current_workspace_id()
        and public.current_workspace_role() in ('admin', 'editor')
    )
  )
);

drop policy if exists "title_commitment_document_links_update_admin_editor" on public.title_commitment_document_links;
create policy "title_commitment_document_links_update_admin_editor"
on public.title_commitment_document_links
for update
using (
  title_commitment_id in (
    select id
    from public.title_commitments
    where project_id in (
      select id
      from public.projects
      where workspace_id = public.current_workspace_id()
        and public.current_workspace_role() in ('admin', 'editor')
    )
  )
)
with check (
  title_commitment_id in (
    select id
    from public.title_commitments
    where project_id in (
      select id
      from public.projects
      where workspace_id = public.current_workspace_id()
        and public.current_workspace_role() in ('admin', 'editor')
    )
  )
);

drop policy if exists "project_documents_delete_admin_editor" on public.project_documents;
create policy "project_documents_delete_admin_editor"
on public.project_documents
for delete
using (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "project_documents_storage_read_authenticated" on storage.objects;
create policy "project_documents_storage_read_authenticated"
on storage.objects
for select
using (
  bucket_id = 'project-documents'
    and auth.role() = 'authenticated'
);

drop policy if exists "project_documents_storage_insert_authenticated" on storage.objects;
create policy "project_documents_storage_insert_authenticated"
on storage.objects
for insert
with check (
  bucket_id = 'project-documents'
    and auth.role() = 'authenticated'
);

drop policy if exists "project_documents_storage_update_authenticated" on storage.objects;
create policy "project_documents_storage_update_authenticated"
on storage.objects
for update
using (
  bucket_id = 'project-documents'
    and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'project-documents'
    and auth.role() = 'authenticated'
);

drop policy if exists "project_documents_storage_delete_authenticated" on storage.objects;
create policy "project_documents_storage_delete_authenticated"
on storage.objects
for delete
using (
  bucket_id = 'project-documents'
    and auth.role() = 'authenticated'
);

commit;
