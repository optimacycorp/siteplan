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
    order by
      coalesce(nullif(p.acreage, 0), ST_Area(p.geom::geography) / 4046.8564224) asc,
      p.created_at asc
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
    order by
      distance_meters asc,
      coalesce(nullif(p.acreage, 0), ST_Area(p.geom::geography) / 4046.8564224) asc,
      p.created_at asc
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
