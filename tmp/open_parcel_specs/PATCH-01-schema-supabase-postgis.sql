-- PATCH-01 — Supabase/PostGIS parcel schema

create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.parcel_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  source_url text,
  jurisdiction text,
  state text,
  county text,
  provider_type text not null check (provider_type in ('arcgis_rest','geojson','shapefile','manual')),
  refresh_mode text not null default 'manual' check (refresh_mode in ('manual','scheduled','on_demand')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.parcel_sources(id) on delete set null,
  source_key text not null,
  external_id text,
  parcel_number text,
  apn text,
  schedule_number text,
  situs_address text,
  owner_name text,
  legal_description text,
  land_use text,
  zoning text,
  acreage numeric,
  geom geometry(MultiPolygon, 4326) not null,
  centroid geography(Point, 4326) generated always as (ST_Centroid(geom)::geography) stored,
  properties jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_id)
);

create index if not exists parcels_geom_gix on public.parcels using gist (geom);
create index if not exists parcels_centroid_gix on public.parcels using gist (centroid);
create index if not exists parcels_parcel_number_idx on public.parcels (parcel_number);
create index if not exists parcels_apn_idx on public.parcels (apn);
create index if not exists parcels_schedule_number_idx on public.parcels (schedule_number);
create index if not exists parcels_situs_address_trgm_idx on public.parcels using gin (situs_address gin_trgm_ops);

create or replace function public.lookup_parcel_by_point(
  p_lng double precision,
  p_lat double precision,
  p_tolerance_meters double precision default 25
)
returns table (
  id uuid,
  source_key text,
  external_id text,
  parcel_number text,
  apn text,
  schedule_number text,
  situs_address text,
  owner_name text,
  legal_description text,
  acreage numeric,
  geojson jsonb,
  match_type text,
  distance_meters double precision,
  properties jsonb
)
language sql
stable
as $$
  with pt as (
    select ST_SetSRID(ST_Point(p_lng, p_lat), 4326) as geom
  ),
  exact as (
    select
      p.*,
      'contains'::text as match_type,
      0::double precision as distance_meters
    from public.parcels p, pt
    where ST_Contains(p.geom, pt.geom)
    limit 5
  ),
  near as (
    select
      p.*,
      'near'::text as match_type,
      ST_Distance(p.geom::geography, pt.geom::geography) as distance_meters
    from public.parcels p, pt
    where not exists (select 1 from exact)
      and ST_DWithin(p.geom::geography, pt.geom::geography, p_tolerance_meters)
    order by distance_meters asc
    limit 5
  )
  select
    id,
    source_key,
    external_id,
    parcel_number,
    apn,
    schedule_number,
    situs_address,
    owner_name,
    legal_description,
    acreage,
    ST_AsGeoJSON(geom)::jsonb as geojson,
    match_type,
    distance_meters,
    properties
  from exact
  union all
  select
    id,
    source_key,
    external_id,
    parcel_number,
    apn,
    schedule_number,
    situs_address,
    owner_name,
    legal_description,
    acreage,
    ST_AsGeoJSON(geom)::jsonb as geojson,
    match_type,
    distance_meters,
    properties
  from near;
$$;
