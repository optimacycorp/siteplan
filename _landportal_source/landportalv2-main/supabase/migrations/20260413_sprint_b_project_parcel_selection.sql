begin;

create table if not exists public.project_parcel_selection (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parcel_snapshot_id uuid references public.parcel_snapshots(id) on delete set null,
  parcel_provider text not null default 'manual_snapshot',
  provider_parcel_id text not null,
  parcel_name text,
  apn text,
  address text,
  jurisdiction text,
  zoning_code text,
  geometry jsonb,
  metadata jsonb not null default '{}'::jsonb,
  selection_role text not null default 'primary',
  status text not null default 'attached',
  selected_by uuid references public.profiles(id),
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, selection_role),
  unique (project_id, provider_parcel_id)
);

create index if not exists idx_project_parcel_selection_project_id
  on public.project_parcel_selection(project_id);

alter table public.project_parcel_selection enable row level security;

create policy "project parcel selections readable by workspace members"
on public.project_parcel_selection
for select
using (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_parcel_selection.project_id
      and wm.user_id = auth.uid()
  )
);

create policy "project parcel selections editable by workspace editors"
on public.project_parcel_selection
for all
using (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_parcel_selection.project_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_parcel_selection.project_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
);

commit;
