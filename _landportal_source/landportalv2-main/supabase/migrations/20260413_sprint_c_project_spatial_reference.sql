begin;

create table if not exists public.project_spatial_reference (
  project_id uuid primary key references public.projects(id) on delete cascade,
  horizontal_epsg integer,
  horizontal_name text not null default 'Local grid',
  horizontal_datum text,
  vertical_reference text,
  units text not null default 'us_survey_ft',
  geoid_model text,
  transform_method text not null default 'anchor_normalized',
  transform_last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_spatial_reference_horizontal_epsg
  on public.project_spatial_reference(horizontal_epsg);

alter table public.project_spatial_reference enable row level security;

create policy "project spatial reference readable by workspace members"
on public.project_spatial_reference
for select
using (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_spatial_reference.project_id
      and wm.user_id = auth.uid()
  )
);

create policy "project spatial reference editable by workspace editors"
on public.project_spatial_reference
for all
using (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_spatial_reference.project_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_spatial_reference.project_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
);

insert into public.project_spatial_reference (
  project_id,
  horizontal_name,
  units,
  transform_method
)
select
  p.id,
  'Local grid',
  'us_survey_ft',
  'anchor_normalized'
from public.projects p
where not exists (
  select 1
  from public.project_spatial_reference psr
  where psr.project_id = p.id
);

commit;
