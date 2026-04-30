# PATCH-02 — Node API Provider Abstraction

## Files to add

```txt
server/parcelProviders/types.mjs
server/parcelProviders/localPostgisProvider.mjs
server/parcelProviders/arcgisParcelProvider.mjs
server/parcelProviders/regridLegacyProvider.mjs
server/openParcelProxy.mjs
```

## Provider interface

```js
/**
 * @typedef {Object} ParcelLookupInput
 * @property {number} lat
 * @property {number} lng
 * @property {string=} query
 * @property {string=} state
 * @property {string=} county
 */

/**
 * @typedef {Object} ParcelLookupResult
 * @property {'found'|'not_found'|'rate_limited'|'error'} status
 * @property {'local-postgis'|'county-arcgis'|'regrid'|'none'} provider
 * @property {Array<any>} features
 * @property {string=} message
 */
```

## New endpoint behavior

`GET /parcel/lookup?lat=38.8921891&lng=-104.8995026&query=3245...`

Response when found:

```json
{
  "status": "found",
  "provider": "local-postgis",
  "features": [{ "type": "Feature", "geometry": {}, "properties": {} }],
  "message": "Parcel matched from local parcel cache."
}
```

Response when no parcel found:

```json
{
  "status": "not_found",
  "provider": "none",
  "features": [],
  "center": { "lat": 38.8921891, "lng": -104.8995026 },
  "message": "Address located, but no parcel polygon was found. Zoomed to the area for manual selection."
}
```

## Environment variables

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPEN_PARCEL_DEFAULT_STATE=CO
OPEN_PARCEL_DEFAULT_COUNTY=El Paso
OPEN_PARCEL_ENABLE_REGRID_FALLBACK=false
REGRID_TOKEN=
```

## Codex task

Refactor current `server/regridProxy.mjs` behavior into a provider-neutral `server/openParcelProxy.mjs`. Keep old `/search` route temporarily, but internally route it through the new provider pipeline. Do not remove Regrid in this patch; disable it by default.
