# PATCH-04 — React Parcel Service Refactor

## Goal
Rename the frontend concept from Regrid-specific to provider-neutral.

## Files likely changed

```txt
src/services/regridParcelService.ts -> src/services/openParcelService.ts
src/hooks/useRegridParcels.ts -> src/hooks/useOpenParcels.ts
src/components/AddressSearch.tsx
src/components/ParcelMap.tsx
```

## TypeScript types

```ts
export type ParcelProvider = 'local-postgis' | 'county-arcgis' | 'state-public-parcels' | 'regrid' | 'none';

export interface OpenParcelFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: {
    id?: string;
    sourceKey?: string;
    parcelNumber?: string;
    apn?: string;
    scheduleNumber?: string;
    situsAddress?: string;
    ownerName?: string;
    acreage?: number;
    matchType?: 'contains' | 'near' | 'manual' | 'provider';
    [key: string]: unknown;
  };
}

export interface OpenParcelLookupResponse {
  status: 'found' | 'not_found' | 'rate_limited' | 'error';
  provider: ParcelProvider;
  features: OpenParcelFeature[];
  center?: { lat: number; lng: number };
  message?: string;
}
```

## UI copy

When geocode works but no parcel is found:

> Address located, but no parcel polygon was found from the parcel provider. I zoomed to the area so you can select or draw the parcel manually.

When local cache is missing:

> This county has not been loaded into the local parcel cache yet. Trying the public county GIS service.

When Regrid fallback is disabled:

> Regrid fallback is disabled. Using open parcel providers only.

## Codex task

Replace user-facing “Regrid” wording with “parcel provider” except in admin/debug screens.
