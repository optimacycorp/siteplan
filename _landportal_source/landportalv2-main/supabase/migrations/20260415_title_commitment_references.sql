begin;

create table if not exists public.title_commitment_references (
  id uuid primary key default gen_random_uuid(),
  title_commitment_id uuid not null references public.title_commitments(id) on delete cascade,
  expected_document_type text not null default 'deed',
  reference_text text not null,
  reference_key text not null,
  brief_description text,
  schedule_section text,
  visit_status text not null default 'pending',
  visited_project_document_id uuid references public.project_documents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title_commitment_id, reference_key)
);

create index if not exists idx_title_commitment_references_commitment_id
  on public.title_commitment_references(title_commitment_id);

drop trigger if exists title_commitment_references_set_updated_at on public.title_commitment_references;
create trigger title_commitment_references_set_updated_at
before update on public.title_commitment_references
for each row execute procedure public.set_updated_at();

alter table public.title_commitment_references enable row level security;

drop policy if exists "title_commitment_references_select_current_workspace" on public.title_commitment_references;
create policy "title_commitment_references_select_current_workspace"
on public.title_commitment_references
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

drop policy if exists "title_commitment_references_insert_admin_editor" on public.title_commitment_references;
create policy "title_commitment_references_insert_admin_editor"
on public.title_commitment_references
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

drop policy if exists "title_commitment_references_update_admin_editor" on public.title_commitment_references;
create policy "title_commitment_references_update_admin_editor"
on public.title_commitment_references
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

commit;
