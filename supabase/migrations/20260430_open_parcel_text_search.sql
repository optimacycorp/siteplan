create or replace function public.search_open_parcels_text(
  p_query text,
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
  geojson jsonb,
  centroid jsonb,
  properties jsonb,
  match_rank integer
)
language sql
stable
as $$
  with needle as (
    select
      trim(coalesce(p_query, '')) as raw_value,
      lower(trim(coalesce(p_query, ''))) as lower_value,
      regexp_replace(lower(trim(coalesce(p_query, ''))), '[^0-9a-z]', '', 'g') as compact_value
  ),
  candidates as (
    select
      p.*,
      coalesce(ps.county, p.properties->>'county', '') as county,
      coalesce(ps.state, p.properties->>'state', '') as state,
      case
        when regexp_replace(lower(coalesce(p.parcel_number, '')), '[^0-9a-z]', '', 'g') = needle.compact_value then 0
        when regexp_replace(lower(coalesce(p.apn, '')), '[^0-9a-z]', '', 'g') = needle.compact_value then 1
        when regexp_replace(lower(coalesce(p.schedule_number, '')), '[^0-9a-z]', '', 'g') = needle.compact_value then 2
        when regexp_replace(lower(coalesce(p.external_id, '')), '[^0-9a-z]', '', 'g') = needle.compact_value then 3
        when lower(coalesce(p.situs_address, '')) = needle.lower_value then 4
        when lower(coalesce(p.owner_name, '')) = needle.lower_value then 5
        when lower(coalesce(p.situs_address, '')) like needle.lower_value || '%' then 10
        when lower(coalesce(p.owner_name, '')) like needle.lower_value || '%' then 11
        when regexp_replace(lower(coalesce(p.parcel_number, '')), '[^0-9a-z]', '', 'g') like needle.compact_value || '%' then 12
        when regexp_replace(lower(coalesce(p.apn, '')), '[^0-9a-z]', '', 'g') like needle.compact_value || '%' then 13
        when lower(coalesce(p.situs_address, '')) like '%' || needle.lower_value || '%' then 20
        when lower(coalesce(p.owner_name, '')) like '%' || needle.lower_value || '%' then 21
        when lower(coalesce(p.legal_description, '')) like '%' || needle.lower_value || '%' then 22
        when lower(coalesce(p.properties->>'HYPERLINK', '')) like '%' || needle.lower_value || '%' then 23
        else 99
      end as match_rank
    from public.parcels p
    left join public.parcel_sources ps on ps.source_key = p.source_key
    cross join needle
    where needle.lower_value <> ''
      and (
        regexp_replace(lower(coalesce(p.parcel_number, '')), '[^0-9a-z]', '', 'g') = needle.compact_value
        or regexp_replace(lower(coalesce(p.apn, '')), '[^0-9a-z]', '', 'g') = needle.compact_value
        or regexp_replace(lower(coalesce(p.schedule_number, '')), '[^0-9a-z]', '', 'g') = needle.compact_value
        or regexp_replace(lower(coalesce(p.external_id, '')), '[^0-9a-z]', '', 'g') = needle.compact_value
        or lower(coalesce(p.situs_address, '')) like '%' || needle.lower_value || '%'
        or lower(coalesce(p.owner_name, '')) like '%' || needle.lower_value || '%'
        or lower(coalesce(p.legal_description, '')) like '%' || needle.lower_value || '%'
        or lower(coalesce(p.properties->>'HYPERLINK', '')) like '%' || needle.lower_value || '%'
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
  where match_rank < 99
  order by match_rank asc, created_at asc
  limit greatest(1, least(coalesce(p_limit, 8), 25));
$$;
