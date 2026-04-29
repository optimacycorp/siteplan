begin;

alter table public.title_commitments
  add column if not exists order_number text,
  add column if not exists date_of_issue date,
  add column if not exists effective_timestamp timestamptz,
  add column if not exists property_address text,
  add column if not exists full_property_description text,
  add column if not exists import_status text not null default 'queued',
  add column if not exists import_error text,
  add column if not exists child_link_count integer not null default 0,
  add column if not exists child_fetch_success_count integer not null default 0,
  add column if not exists child_fetch_failure_count integer not null default 0;

alter table public.project_documents
  add column if not exists source_commitment_id uuid references public.title_commitments(id) on delete set null,
  add column if not exists source_page_number integer,
  add column if not exists source_reference_text text;

alter table public.title_commitment_references
  add column if not exists source_page integer,
  add column if not exists source_section text,
  add column if not exists link_url text,
  add column if not exists fetch_status text not null default 'pending',
  add column if not exists fetch_error text,
  add column if not exists match_confidence numeric(5,2);

alter table public.title_commitment_document_links
  add column if not exists source_page_number integer,
  add column if not exists source_reference_text text,
  add column if not exists external_reference text;

create table if not exists public.title_commitment_import_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title_commitment_id uuid not null references public.title_commitments(id) on delete cascade,
  primary_document_id uuid not null references public.project_documents(id) on delete cascade,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  stats jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_title_commitment_import_jobs_project_id
  on public.title_commitment_import_jobs(project_id);

create index if not exists idx_title_commitment_import_jobs_commitment_id
  on public.title_commitment_import_jobs(title_commitment_id);

create index if not exists idx_project_documents_source_commitment_id
  on public.project_documents(source_commitment_id);

drop trigger if exists title_commitment_import_jobs_set_updated_at on public.title_commitment_import_jobs;
create trigger title_commitment_import_jobs_set_updated_at
before update on public.title_commitment_import_jobs
for each row execute procedure public.set_updated_at();

alter table public.title_commitment_import_jobs enable row level security;

drop policy if exists "title_commitment_import_jobs_select_current_workspace" on public.title_commitment_import_jobs;
create policy "title_commitment_import_jobs_select_current_workspace"
on public.title_commitment_import_jobs
for select
using (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
  )
);

drop policy if exists "title_commitment_import_jobs_insert_admin_editor" on public.title_commitment_import_jobs;
create policy "title_commitment_import_jobs_insert_admin_editor"
on public.title_commitment_import_jobs
for insert
with check (
  project_id in (
    select id
    from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "title_commitment_import_jobs_update_admin_editor" on public.title_commitment_import_jobs;
create policy "title_commitment_import_jobs_update_admin_editor"
on public.title_commitment_import_jobs
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

create or replace function public.delete_title_commitment_stack(
  p_project_id uuid,
  p_title_commitment_id uuid
)
returns table (
  deleted_id uuid,
  next_active_commitment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title_commitment public.title_commitments%rowtype;
  v_workspace_role text;
  v_next_active_commitment_id uuid;
begin
  v_workspace_role := public.current_workspace_role();

  if v_workspace_role is null or v_workspace_role not in ('admin', 'editor') then
    raise exception 'Insufficient permissions to delete title commitments';
  end if;

  select *
  into v_title_commitment
  from public.title_commitments
  where id = p_title_commitment_id
    and project_id = p_project_id;

  if not found then
    raise exception 'Title commitment not found for project';
  end if;

  update public.project_documents
  set
    status = case
      when document_type = 'title_commitment' then 'archived'
      else status
    end,
    source_commitment_id = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'archivedFromTitleCommitmentId', p_title_commitment_id,
      'archivedAt', now()
    ),
    updated_at = now()
  where source_commitment_id = p_title_commitment_id
     or parent_document_id = v_title_commitment.primary_document_id
     or id = v_title_commitment.primary_document_id;

  delete from public.title_commitment_document_links
  where title_commitment_id = p_title_commitment_id;

  delete from public.title_commitment_references
  where title_commitment_id = p_title_commitment_id;

  delete from public.title_commitment_import_jobs
  where title_commitment_id = p_title_commitment_id;

  delete from public.title_commitments
  where id = p_title_commitment_id;

  select id
  into v_next_active_commitment_id
  from public.title_commitments
  where project_id = p_project_id
  order by is_primary desc, updated_at desc, created_at desc
  limit 1;

  if v_next_active_commitment_id is not null then
    update public.title_commitments
    set is_primary = case when id = v_next_active_commitment_id then true else false end,
        updated_at = now()
    where project_id = p_project_id;
  end if;

  deleted_id := p_title_commitment_id;
  next_active_commitment_id := v_next_active_commitment_id;
  return next;
end;
$$;

grant execute on function public.delete_title_commitment_stack(uuid, uuid) to authenticated;

commit;
