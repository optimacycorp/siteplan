create table if not exists public.site_plan_layouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parcel_snapshot_id uuid references public.parcel_snapshots(id) on delete set null,
  name text not null,
  status text not null default 'draft',
  planner_settings jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_plan_elements (
  id uuid primary key default gen_random_uuid(),
  site_plan_layout_id uuid not null references public.site_plan_layouts(id) on delete cascade,
  element_type text not null,
  label text,
  geometry jsonb,
  style jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_plan_layouts_set_updated_at on public.site_plan_layouts;
create trigger site_plan_layouts_set_updated_at before update on public.site_plan_layouts for each row execute procedure public.set_updated_at();
drop trigger if exists site_plan_elements_set_updated_at on public.site_plan_elements;
create trigger site_plan_elements_set_updated_at before update on public.site_plan_elements for each row execute procedure public.set_updated_at();

alter table public.site_plan_layouts enable row level security;
alter table public.site_plan_elements enable row level security;

drop policy if exists "site_plan_layouts_select_current_workspace" on public.site_plan_layouts;
create policy "site_plan_layouts_select_current_workspace" on public.site_plan_layouts for select using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id())
);
drop policy if exists "site_plan_layouts_insert_admin_editor" on public.site_plan_layouts;
create policy "site_plan_layouts_insert_admin_editor" on public.site_plan_layouts for insert with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);
drop policy if exists "site_plan_layouts_update_admin_editor" on public.site_plan_layouts;
create policy "site_plan_layouts_update_admin_editor" on public.site_plan_layouts for update using (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
) with check (
  project_id in (select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor'))
);

drop policy if exists "site_plan_elements_select_current_workspace" on public.site_plan_elements;
create policy "site_plan_elements_select_current_workspace" on public.site_plan_elements for select using (
  site_plan_layout_id in (
    select id from public.site_plan_layouts where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id()
    )
  )
);
drop policy if exists "site_plan_elements_insert_admin_editor" on public.site_plan_elements;
create policy "site_plan_elements_insert_admin_editor" on public.site_plan_elements for insert with check (
  site_plan_layout_id in (
    select id from public.site_plan_layouts where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
);
drop policy if exists "site_plan_elements_update_admin_editor" on public.site_plan_elements;
create policy "site_plan_elements_update_admin_editor" on public.site_plan_elements for update using (
  site_plan_layout_id in (
    select id from public.site_plan_layouts where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
) with check (
  site_plan_layout_id in (
    select id from public.site_plan_layouts where project_id in (
      select id from public.projects where workspace_id = public.current_workspace_id() and public.current_workspace_role() in ('admin','editor')
    )
  )
);
