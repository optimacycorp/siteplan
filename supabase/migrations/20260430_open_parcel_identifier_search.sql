create or replace function public.search_open_parcel_by_identifier(
  p_identifier text,
  p_limit integer default 5
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
  properties jsonb,
  match_rank integer
)
language sql
stable
as $$
  with needle as (
    select regexp_replace(coalesce(p_identifier, ''), '[^0-9A-Za-z]', '', 'g') as raw_value
  ),
  candidates as (
    select
      p.*,
      coalesce(ps.county, p.properties->>'county', '') as county,
      coalesce(ps.state, p.properties->>'state', '') as state,
      case
        when regexp_replace(coalesce(p.parcel_number, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value then 0
        when regexp_replace(coalesce(p.apn, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value then 1
        when regexp_replace(coalesce(p.schedule_number, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value then 2
        when regexp_replace(coalesce(p.external_id, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value then 3
        else 99
      end as match_rank
    from public.parcels p
    left join public.parcel_sources ps on ps.source_key = p.source_key
    cross join needle
    where needle.raw_value <> ''
      and (
        regexp_replace(coalesce(p.parcel_number, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value
        or regexp_replace(coalesce(p.apn, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value
        or regexp_replace(coalesce(p.schedule_number, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value
        or regexp_replace(coalesce(p.external_id, ''), '[^0-9A-Za-z]', '', 'g') = needle.raw_value
      )
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
    zoning,
    acreage,
    county,
    state,
    ST_AsGeoJSON(geom)::jsonb as geojson,
    ST_AsGeoJSON(centroid::geometry)::jsonb as centroid,
    properties,
    match_rank
  from candidates
  order by match_rank asc, created_at asc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;
