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

Environment variables:

```bash
OPEN_PARCEL_DEFAULT_STATE=CO
OPEN_PARCEL_DEFAULT_COUNTY=El Paso
OPEN_PARCEL_ENABLE_REGRID_FALLBACK=false
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REGRID_API_TOKEN=
```
