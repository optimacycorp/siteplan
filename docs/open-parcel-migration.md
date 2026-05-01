# Open Parcel Migration

This app is moving from a Regrid-first parcel flow to a provider-neutral parcel stack.

Current first slice:

- `server/openParcelProxy.mjs` is the new provider-neutral proxy.
- `server/regridProxy.mjs` is now only a compatibility shim for the existing systemd service name.
- Geocoding remains public-first via Census/Nominatim.
- Parcel lookup is provider-neutral at `/parcel/lookup`.
- Regrid remains an optional legacy fallback behind `OPEN_PARCEL_ENABLE_REGRID_FALLBACK=false` by default.
- Frontend service naming has shifted to `openParcelService`.

Planned next slices:

1. Supabase/PostGIS local parcel lookup provider.
2. El Paso County ArcGIS dry-run loader.
3. On-demand cache insert on county lookup success.
4. Remove the default Regrid fallback path.

Current second slice:

- `server/parcelProviders/localPostgisProvider.mjs` reads parcel hits from Supabase RPC functions.
- `supabase/migrations/20260430_open_parcel_provider_functions.sql` adds parcel detail and neighbor RPC helpers.
- `scripts/parcel-loaders/load-el-paso-county-parcels.mjs` provides the first county loader scaffold with a safe dry-run mode.

Environment variables:

```bash
OPEN_PARCEL_DEFAULT_STATE=CO
OPEN_PARCEL_DEFAULT_COUNTY=El Paso
OPEN_PARCEL_ENABLE_REGRID_FALLBACK=false
OPEN_PARCEL_POINT_TOLERANCE_METERS=25
OPEN_PARCEL_NEIGHBOR_RADIUS_METERS=150
OPEN_PARCEL_NEIGHBOR_LIMIT=8
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REGRID_API_TOKEN=
```

Dry-run loader command:

```bash
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --dry-run --limit 25
```

Preset-driven area imports:

```bash
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --list-presets
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --preset cedar-heights-rampart
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --preset cedar-heights-north
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --preset cedar-heights-south
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --preset cedar-heights-broad
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --preset garden-of-the-gods-corridor
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --preset rampart-click-7333200002
```

Batch target-area imports:

```bash
node scripts/parcel-loaders/load-colorado-springs-target-areas.mjs --list-groups
node scripts/parcel-loaders/load-colorado-springs-target-areas.mjs --group core
node scripts/parcel-loaders/load-colorado-springs-target-areas.mjs --group expanded
node scripts/parcel-loaders/load-colorado-springs-target-areas.mjs --group broad
```

Package shortcuts:

```bash
pnpm parcels:load:cs-core
pnpm parcels:load:cs-expanded
pnpm parcels:load:cs-broad
```

Useful targeted import commands:

```bash
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --around 38.878370,-104.897322 --radius-meters 250 --limit 500 --page-size 100
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --parcel-id 7333200002 --limit 10
```

Recommended Colorado Springs workflow:

1. Start with `--preset cedar-heights-rampart` to load the immediate target zone.
2. Use `--around <lat>,<lng>` after a failed click to import a tighter parcel cluster.
3. Expand with `--preset cedar-heights-broad` when address ranking needs more nearby candidates.
4. Use the batch runner `--group expanded` or `pnpm parcels:load:cs-expanded` when you want repeatable neighborhood coverage without remembering each preset.

Debug endpoints:

```bash
curl -i "https://siteplan.gomil.com/regrid/debug/import-runs?limit=10"
curl -i "https://siteplan.gomil.com/regrid/debug/search-diagnostics?query=3245%20Rampart%20Range%20Road%2C%2080919%2C%20Colorado%20Springs%2C%20Colorado"
curl -i "https://siteplan.gomil.com/regrid/debug/search-diagnostics?query=7333200002"
```

How to use them:

1. `debug/import-runs` shows the most recent parcel imports and whether they succeeded.
2. `debug/search-diagnostics` shows:
   - whether a query is being treated like an address or parcel identifier
   - local identifier/text matches
   - the geocode candidates being tested
   - the nearby local parcel candidates gathered around each geocode point
