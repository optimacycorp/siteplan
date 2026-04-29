create table if not exists public.project_map_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  system text not null default 'NAD83(2011) / Colorado Central (ftUS)',
  map_label text not null default 'Workspace view',
  anchor_lng double precision not null,
  anchor_lat double precision not null,
  anchor_zoom double precision not null default 15.9,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_points (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  code text not null default 'P',
  northing double precision not null,
  easting double precision not null,
  elevation double precision not null default 0,
  collected_at timestamptz not null default now(),
  collector text not null default '',
  solution text not null default 'FIX',
  rms text not null default '0.000 sft',
  created_at timestamptz not null default now()
);

create table if not exists public.survey_segments (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  from_point_id text not null references public.survey_points(id) on delete cascade,
  to_point_id text not null references public.survey_points(id) on delete cascade,
  label text not null default 'survey line',
  created_at timestamptz not null default now()
);

drop trigger if exists project_map_settings_set_updated_at on public.project_map_settings;
create trigger project_map_settings_set_updated_at
before update on public.project_map_settings
for each row execute procedure public.set_updated_at();

alter table public.project_map_settings enable row level security;
alter table public.survey_points enable row level security;
alter table public.survey_segments enable row level security;

drop policy if exists "project_map_settings_select_current_workspace" on public.project_map_settings;
create policy "project_map_settings_select_current_workspace"
on public.project_map_settings
for select
using (
  project_id in (
    select id from public.projects where workspace_id = public.current_workspace_id()
  )
);

drop policy if exists "project_map_settings_insert_admin_editor" on public.project_map_settings;
create policy "project_map_settings_insert_admin_editor"
on public.project_map_settings
for insert
with check (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "project_map_settings_update_admin_editor" on public.project_map_settings;
create policy "project_map_settings_update_admin_editor"
on public.project_map_settings
for update
using (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
)
with check (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "survey_points_select_current_workspace" on public.survey_points;
create policy "survey_points_select_current_workspace"
on public.survey_points
for select
using (
  project_id in (
    select id from public.projects where workspace_id = public.current_workspace_id()
  )
);

drop policy if exists "survey_points_insert_admin_editor" on public.survey_points;
create policy "survey_points_insert_admin_editor"
on public.survey_points
for insert
with check (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "survey_points_update_admin_editor" on public.survey_points;
create policy "survey_points_update_admin_editor"
on public.survey_points
for update
using (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
)
with check (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "survey_segments_select_current_workspace" on public.survey_segments;
create policy "survey_segments_select_current_workspace"
on public.survey_segments
for select
using (
  project_id in (
    select id from public.projects where workspace_id = public.current_workspace_id()
  )
);

drop policy if exists "survey_segments_insert_admin_editor" on public.survey_segments;
create policy "survey_segments_insert_admin_editor"
on public.survey_segments
for insert
with check (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);

drop policy if exists "survey_segments_update_admin_editor" on public.survey_segments;
create policy "survey_segments_update_admin_editor"
on public.survey_segments
for update
using (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
)
with check (
  project_id in (
    select id from public.projects
    where workspace_id = public.current_workspace_id()
      and public.current_workspace_role() in ('admin', 'editor')
  )
);
