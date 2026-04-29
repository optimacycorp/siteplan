begin;

alter table if exists public.parcel_snapshots
  add column if not exists source_provider text,
  add column if not exists source_parcel_id text,
  add column if not exists county text,
  add column if not exists state text,
  add column if not exists zip_code text,
  add column if not exists zoning_code text,
  add column if not exists land_use text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.parcel_geometries
  add column if not exists geometry_role text not null default 'raw_boundary',
  add column if not exists srid integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parcel_geometries_snapshot_role_key'
  ) then
    alter table public.parcel_geometries
      add constraint parcel_geometries_snapshot_role_key unique (parcel_snapshot_id, geometry_role);
  end if;
end $$;

alter table if exists public.parcel_constraints
  add column if not exists source_provider text,
  add column if not exists area_sqft numeric,
  add column if not exists severity text not null default 'hard';

create table if not exists public.parcel_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  parcel_snapshot_id uuid not null references public.parcel_snapshots(id) on delete cascade,
  triggered_by uuid references public.profiles(id),
  engine_version text not null,
  ruleset jsonb not null default '{}'::jsonb,
  result_record_id uuid references public.parcel_intelligence_records(id) on delete set null,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now()
);

alter table if exists public.parcel_intelligence_records
  add column if not exists risk_score numeric;

alter table if exists public.yield_scenarios
  add column if not exists parcel_snapshot_id uuid references public.parcel_snapshots(id),
  add column if not exists parcel_intelligence_record_id uuid references public.parcel_intelligence_records(id);

alter table if exists public.subdivision_layouts
  add column if not exists parcel_intelligence_record_id uuid references public.parcel_intelligence_records(id);

alter table if exists public.site_plan_layouts
  add column if not exists parcel_intelligence_record_id uuid references public.parcel_intelligence_records(id);

alter table if exists public.project_documents
  add column if not exists parcel_snapshot_id uuid references public.parcel_snapshots(id);

create index if not exists idx_parcel_analysis_runs_snapshot_id
  on public.parcel_analysis_runs(parcel_snapshot_id);

alter table public.parcel_analysis_runs enable row level security;

drop policy if exists "parcel analysis runs readable by workspace members" on public.parcel_analysis_runs;
create policy "parcel analysis runs readable by workspace members"
on public.parcel_analysis_runs
for select
using (
  exists (
    select 1
    from public.parcel_snapshots ps
    join public.projects p on p.id = ps.project_id
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where ps.id = parcel_analysis_runs.parcel_snapshot_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "parcel analysis runs editable by workspace editors" on public.parcel_analysis_runs;
create policy "parcel analysis runs editable by workspace editors"
on public.parcel_analysis_runs
for all
using (
  exists (
    select 1
    from public.parcel_snapshots ps
    join public.projects p on p.id = ps.project_id
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where ps.id = parcel_analysis_runs.parcel_snapshot_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.parcel_snapshots ps
    join public.projects p on p.id = ps.project_id
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where ps.id = parcel_analysis_runs.parcel_snapshot_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
);

commit;
