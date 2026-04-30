# PATCH-03 — El Paso County ArcGIS Loader

## Goal
Add a script that can seed and refresh El Paso County parcel polygons into Supabase/PostGIS.

## Files to add

```txt
scripts/parcel-loaders/load-el-paso-county-parcels.mjs
scripts/parcel-loaders/lib/arcgisQuery.mjs
scripts/parcel-loaders/lib/normalizeParcelFeature.mjs
scripts/parcel-loaders/lib/upsertParcel.mjs
```

## Loader behavior

1. Query ArcGIS REST layer in pages.
2. Request GeoJSON where supported; otherwise request JSON and convert rings.
3. Reproject to EPSG:4326 when needed.
4. Normalize fields into the `parcels` table.
5. Store raw attributes in `properties`.
6. Upsert by `source_key + external_id`.

## Source config

```js
export const EL_PASO_COUNTY_PARCELS = {
  sourceKey: 'co-el-paso-county-parcels',
  sourceName: 'El Paso County GIS Parcels',
  providerType: 'arcgis_rest',
  serviceUrl: 'https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/Parcels/MapServer/0',
  sourceWkid: 2232,
  targetSrid: 4326,
  pageSize: 1000,
  idFieldCandidates: ['OBJECTID', 'FID', 'PARCEL_ID', 'SCHEDULE'],
  parcelNumberCandidates: ['PARCEL', 'PARCEL_NO', 'PARCEL_NUM', 'SCHEDULE', 'ACCOUNT'],
  addressCandidates: ['SITUS', 'SITEADDR', 'ADDRESS', 'PROP_ADDR'],
  ownerCandidates: ['OWNER', 'OWNER_NAME', 'TAXPAYER'],
  legalCandidates: ['LEGAL', 'LEGAL_DESC']
};
```

## Commands

```bash
pnpm add @supabase/supabase-js proj4 p-limit
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --limit 1000
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --all
```

## Codex task

Create the loader with safe dry-run mode first:

```bash
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --dry-run --limit 25
```

The dry run should print:
- feature count fetched
- sample normalized record
- detected geometry type
- detected field mapping
