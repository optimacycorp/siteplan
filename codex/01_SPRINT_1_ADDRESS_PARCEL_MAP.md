# Codex Patch 01 - Address Search and Parcel Map

## Intent

Implement the first usable flow: address search, parcel result selection, selected parcel boundary on map, and parcel summary.

## Source code to reuse from current Land Portal

Adapt, do not blindly copy:

- `apps/web/src/modules/map/BaseMapCanvas.tsx`
- `apps/web/src/modules/map/MapLayerManager.ts`
- `apps/web/src/modules/map/mapProviderRegistry.ts`
- `apps/web/src/modules/parcel/regridParcelService.ts`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Field.tsx`
- `apps/web/src/components/feedback/LoadingState.tsx`

## Required changes

1. Create `src/services/regridParcelService.ts`.
2. Create `src/components/AddressSearch.tsx`.
3. Create `src/components/ParcelSummary.tsx`.
4. Create `src/map/QuickMapCanvas.tsx`.
5. Create `src/map/mapLayerManager.ts` and `src/map/basemapRegistry.ts`.
6. Create `src/map/mapLayers.ts` to convert selected parcel/adjoining parcels into layer descriptors.
7. Create `src/state/quickSiteStore.ts` with selected parcel, search results, basemap, and layer visibility.
8. Wire the flow into `src/App.tsx`.

## UX requirements

- Left panel has a clear address search field.
- Search results show address/headline, APN if available, and context.
- Selected parcel is obvious on map.
- Right panel shows parcel summary.
- User can toggle adjoining parcels.

## Environment

Use:

```bash
VITE_REGRID_PROXY_BASE_URL=http://localhost:8787/regrid/
```

Do not expose the Regrid token in browser code.

## Acceptance checks

- Searching Rampart Range Road returns results when proxy is available.
- Selecting a result fetches detail by UUID.
- Map fits the selected geometry.
- Selected parcel layer updates without full page refresh.
- Empty/no-result/error states are friendly.
