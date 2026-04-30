create or replace function public.get_open_parcel_detail(
  p_id uuid
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
  zoning text,
  acreage numeric,
  county text,
  state text,
  geojson jsonb,
  centroid jsonb,
  properties jsonb
)
language sql
stable
as $$
  select
    p.id,
    p.source_key,
    p.external_id,
    p.parcel_number,
    p.apn,
    p.schedule_number,
    p.situs_address,
    p.owner_name,
    p.legal_description,
    p.zoning,
    p.acreage,
    coalesce(ps.county, p.properties->>'county', '') as county,
    coalesce(ps.state, p.properties->>'state', '') as state,
    ST_AsGeoJSON(p.geom)::jsonb as geojson,
    ST_AsGeoJSON(p.centroid::geometry)::jsonb as centroid,
    p.properties
  from public.parcels p
  left join public.parcel_sources ps on ps.source_key = p.source_key
  where p.id = p_id
  limit 1;
$$;

create or replace function public.lookup_open_parcel_neighbors(
  p_lng double precision,
  p_lat double precision,
  p_exclude_id uuid default null,
  p_radius_meters double precision default 150,
  p_limit integer default 8
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
  zoning text,
  acreage numeric,
  county text,
  state text,
  distance_meters double precision,
  geojson jsonb,
  centroid jsonb,
  properties jsonb
)
language sql
stable
as $$
  with pt as (
    select ST_SetSRID(ST_Point(p_lng, p_lat), 4326)::geography as geog
  )
  select
    p.id,
    p.source_key,
    p.external_id,
    p.parcel_number,
    p.apn,
    p.schedule_number,
    p.situs_address,
    p.owner_name,
    p.legal_description,
    p.zoning,
    p.acreage,
    coalesce(ps.county, p.properties->>'county', '') as county,
    coalesce(ps.state, p.properties->>'state', '') as state,
    ST_Distance(p.centroid, pt.geog) as distance_meters,
    ST_AsGeoJSON(p.geom)::jsonb as geojson,
    ST_AsGeoJSON(p.centroid::geometry)::jsonb as centroid,
    p.properties
  from public.parcels p
  left join public.parcel_sources ps on ps.source_key = p.source_key
  cross join pt
  where (p_exclude_id is null or p.id <> p_exclude_id)
    and ST_DWithin(p.centroid, pt.geog, p_radius_meters)
  order by ST_Distance(p.centroid, pt.geog) asc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
$$;
