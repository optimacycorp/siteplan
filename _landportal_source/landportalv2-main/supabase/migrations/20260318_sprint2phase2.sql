create table if not exists public.parcel_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  source text,
  apn text,
  address text,
  jurisdiction text,
  zoning text,
  acreage numeric not null default 0,
  buildable_acres numeric not null default 0,
  frontage_ft numeric not null default 0,
  flood_zone text not null default 'X',
  raw_attributes jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parcel_geometries (
  id uuid primary key default gen_random_uuid(),
  parcel_snapshot_id uuid not null references public.parcel_snapshots(id) on delete cascade,
  geometry jsonb not null,
  geometry_type text not null default 'polygon',
  area_sqft numeric,
  perimeter_ft numeric,
  bbox jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.parcel_constraints (
  id uuid primary key default gen_random_uuid(),
  parcel_snapshot_id uuid not null references public.parcel_snapshots(id) on delete cascade,
  constraint_type text not null,
  label text,
  geometry jsonb,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.yield_scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  selected_parcel_snapshot_id uuid references public.parcel_snapshots(id) on delete set null,
  name text not null,
  status text not null default 'draft',
  assumptions jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subdivision_rulesets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  jurisdiction text,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subdivision_layouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parcel_snapshot_id uuid references public.parcel_snapshots(id) on delete set null,
  ruleset_id uuid references public.subdivision_rulesets(id) on delete set null,
  name text not null,
  status text not null default 'draft',
  metrics jsonb not null default '{}'::jsonb,
  layout_data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_type text not null,
  title text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  storage_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists parcel_snapshots_set_updated_at on public.parcel_snapshots;
create trigger parcel_snapshots_set_updated_at before update on public.parcel_snapshots for each row execute procedure public.set_updated_at();
drop trigger if exists yield_scenarios_set_updated_at on public.yield_scenarios;
create trigger yield_scenarios_set_updated_at before update on public.yield_scenarios for each row execute procedure public.set_updated_at();
drop trigger if exists subdivision_rulesets_set_updated_at on public.subdivision_rulesets;
create trigger subdivision_rulesets_set_updated_at before update on public.subdivision_rulesets for each row execute procedure public.set_updated_at();
drop trigger if exists subdivision_layouts_set_updated_at on public.subdivision_layouts;
create trigger subdivision_layouts_set_updated_at before update on public.subdivision_layouts for each row execute procedure public.set_updated_at();
drop trigger if exists project_documents_set_updated_at on public.project_documents;
create trigger project_documents_set_updated_at before update on public.project_documents for each row execute procedure public.set_updated_at();

alter table public.parcel_snapshots enable row level security;
alter table public.parcel_geometries enable row level security;
alter table public.parcel_constraints enable row level security;
alter table public.yield_scenarios enable row level security;
alter table public.subdivision_rulesets enable row level security;
alter table public.subdivision_layouts enable row level security;
alter table public.project_documents enable row level security;

drop policy if exists "parcel_snapshots_select_current_workspace" on public.parcel_snapshots;
create policy "parcel_snapshots_select_current_workspace" on public.parcel_snapshots for select using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id())
);
drop policy if exists "parcel_snapshots_insert_admin_editor" on public.parcel_snapshots;
create policy "parcel_snapshots_insert_admin_editor" on public.parcel_snapshots for insert with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);
drop policy if exists "parcel_snapshots_update_admin_editor" on public.parcel_snapshots;
create policy "parcel_snapshots_update_admin_editor" on public.parcel_snapshots for update using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
) with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);

drop policy if exists "parcel_geometries_select_current_workspace" on public.parcel_geometries;
create policy "parcel_geometries_select_current_workspace" on public.parcel_geometries for select using (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id()))
);
drop policy if exists "parcel_geometries_insert_admin_editor" on public.parcel_geometries;
create policy "parcel_geometries_insert_admin_editor" on public.parcel_geometries for insert with check (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')))
);
drop policy if exists "parcel_geometries_update_admin_editor" on public.parcel_geometries;
create policy "parcel_geometries_update_admin_editor" on public.parcel_geometries for update using (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')))
) with check (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')))
);

drop policy if exists "parcel_constraints_select_current_workspace" on public.parcel_constraints;
create policy "parcel_constraints_select_current_workspace" on public.parcel_constraints for select using (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id()))
);
drop policy if exists "parcel_constraints_insert_admin_editor" on public.parcel_constraints;
create policy "parcel_constraints_insert_admin_editor" on public.parcel_constraints for insert with check (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')))
);
drop policy if exists "parcel_constraints_update_admin_editor" on public.parcel_constraints;
create policy "parcel_constraints_update_admin_editor" on public.parcel_constraints for update using (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')))
) with check (
  parcel_snapshot_id in (select id from public.parcel_snapshots where project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')))
);

drop policy if exists "yield_scenarios_select_current_workspace" on public.yield_scenarios;
create policy "yield_scenarios_select_current_workspace" on public.yield_scenarios for select using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id())
);
drop policy if exists "yield_scenarios_insert_admin_editor" on public.yield_scenarios;
create policy "yield_scenarios_insert_admin_editor" on public.yield_scenarios for insert with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);
drop policy if exists "yield_scenarios_update_admin_editor" on public.yield_scenarios;
create policy "yield_scenarios_update_admin_editor" on public.yield_scenarios for update using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
) with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);

drop policy if exists "subdivision_rulesets_select_current_workspace" on public.subdivision_rulesets;
create policy "subdivision_rulesets_select_current_workspace" on public.subdivision_rulesets for select using (
  coalesce(workspace_id, public.current_workspace_id()) = public.current_workspace_id()
);
drop policy if exists "subdivision_rulesets_insert_admin_editor" on public.subdivision_rulesets;
create policy "subdivision_rulesets_insert_admin_editor" on public.subdivision_rulesets for insert with check (
  coalesce(workspace_id, public.current_workspace_id()) = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
);
drop policy if exists "subdivision_rulesets_update_admin_editor" on public.subdivision_rulesets;
create policy "subdivision_rulesets_update_admin_editor" on public.subdivision_rulesets for update using (
  coalesce(workspace_id, public.current_workspace_id()) = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
) with check (
  coalesce(workspace_id, public.current_workspace_id()) = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
);

drop policy if exists "subdivision_layouts_select_current_workspace" on public.subdivision_layouts;
create policy "subdivision_layouts_select_current_workspace" on public.subdivision_layouts for select using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id())
);
drop policy if exists "subdivision_layouts_insert_admin_editor" on public.subdivision_layouts;
create policy "subdivision_layouts_insert_admin_editor" on public.subdivision_layouts for insert with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);
drop policy if exists "subdivision_layouts_update_admin_editor" on public.subdivision_layouts;
create policy "subdivision_layouts_update_admin_editor" on public.subdivision_layouts for update using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
) with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);

drop policy if exists "project_documents_select_current_workspace" on public.project_documents;
create policy "project_documents_select_current_workspace" on public.project_documents for select using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id())
);
drop policy if exists "project_documents_insert_admin_editor" on public.project_documents;
create policy "project_documents_insert_admin_editor" on public.project_documents for insert with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);
drop policy if exists "project_documents_update_admin_editor" on public.project_documents;
create policy "project_documents_update_admin_editor" on public.project_documents for update using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
) with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);
