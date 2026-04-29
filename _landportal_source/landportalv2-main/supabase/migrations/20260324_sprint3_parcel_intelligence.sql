create table if not exists public.parcel_intelligence_records (
  id uuid primary key default gen_random_uuid(),
  parcel_snapshot_id uuid not null references public.parcel_snapshots(id) on delete cascade,
  analysis_version text not null default 'v1',
  gross_area_sqft numeric,
  gross_area_acres numeric,
  buildable_area_sqft numeric,
  buildable_area_acres numeric,
  frontage_ft numeric,
  avg_depth_ft numeric,
  max_depth_ft numeric,
  min_depth_ft numeric,
  compactness_score numeric,
  irregularity_score numeric,
  constraint_coverage_percent numeric,
  shape_classification text,
  access_classification text,
  best_subdivision_strategy text,
  buildability_score numeric,
  warnings jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parcel_frontage_edges (
  id uuid primary key default gen_random_uuid(),
  parcel_snapshot_id uuid not null references public.parcel_snapshots(id) on delete cascade,
  edge_index integer not null,
  line_geometry jsonb not null,
  length_ft numeric,
  edge_role text not null default 'candidate',
  touches_public_row boolean not null default false,
  is_selected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.parcel_geometries add column if not exists geometry_role text not null default 'raw_boundary';
alter table public.yield_scenarios add column if not exists parcel_intelligence_record_id uuid references public.parcel_intelligence_records(id) on delete set null;
alter table public.subdivision_layouts add column if not exists parcel_intelligence_record_id uuid references public.parcel_intelligence_records(id) on delete set null;
alter table public.site_plan_layouts add column if not exists parcel_intelligence_record_id uuid references public.parcel_intelligence_records(id) on delete set null;
alter table public.project_documents add column if not exists parcel_snapshot_id uuid references public.parcel_snapshots(id) on delete set null;

drop trigger if exists parcel_intelligence_records_set_updated_at on public.parcel_intelligence_records;
create trigger parcel_intelligence_records_set_updated_at before update on public.parcel_intelligence_records for each row execute procedure public.set_updated_at();

alter table public.parcel_intelligence_records enable row level security;
alter table public.parcel_frontage_edges enable row level security;

drop policy if exists "parcel_intelligence_records_select_current_workspace" on public.parcel_intelligence_records;
create policy "parcel_intelligence_records_select_current_workspace" on public.parcel_intelligence_records for select using (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id()
    )
  )
);

drop policy if exists "parcel_intelligence_records_insert_admin_editor" on public.parcel_intelligence_records;
create policy "parcel_intelligence_records_insert_admin_editor" on public.parcel_intelligence_records for insert with check (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
);

drop policy if exists "parcel_intelligence_records_update_admin_editor" on public.parcel_intelligence_records;
create policy "parcel_intelligence_records_update_admin_editor" on public.parcel_intelligence_records for update using (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
) with check (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
);

drop policy if exists "parcel_frontage_edges_select_current_workspace" on public.parcel_frontage_edges;
create policy "parcel_frontage_edges_select_current_workspace" on public.parcel_frontage_edges for select using (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id()
    )
  )
);

drop policy if exists "parcel_frontage_edges_insert_admin_editor" on public.parcel_frontage_edges;
create policy "parcel_frontage_edges_insert_admin_editor" on public.parcel_frontage_edges for insert with check (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
);

drop policy if exists "parcel_frontage_edges_update_admin_editor" on public.parcel_frontage_edges;
create policy "parcel_frontage_edges_update_admin_editor" on public.parcel_frontage_edges for update using (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
) with check (
  parcel_snapshot_id in (
    select id from public.parcel_snapshots where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
);
