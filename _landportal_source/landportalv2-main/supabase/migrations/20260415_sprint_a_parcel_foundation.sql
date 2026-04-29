begin;

alter table public.project_parcel_selection
  add column if not exists centroid jsonb,
  add column if not exists bbox jsonb,
  add column if not exists provider_path text,
  add column if not exists provider_context text,
  add column if not exists geometry_source text not null default 'provider',
  add column if not exists source_recorded_at timestamptz not null default now(),
  add column if not exists source_last_refreshed_at timestamptz,
  add column if not exists anchor_status text not null default 'active';

create index if not exists idx_project_parcel_selection_anchor_status
  on public.project_parcel_selection(anchor_status);

commit;
