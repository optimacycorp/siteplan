# Codex Patch — Sprint 1: USGS 3DEP / Contour Overlay

## Intent

Add a simple USGS-derived contour overlay to the existing QuickSite MVP using the existing `layerVisibility.contours` toggle. Keep the UI simple and do not add heavy GIS controls.

## Current code observations

- `LayerPanel.tsx` already lists `contours` in advanced layers.
- `quickSiteStore.ts` already has `layerVisibility.contours: false`.
- `QuickMapCanvas.tsx` owns MapLibre initialization and app-layer sync.
- `mapLayerManager.ts` only handles GeoJSON app layers.
- Basemap style changes require overlays to be re-added after style reload.

## Requirements

1. Add a new terrain overlay manager.
2. Add a USGS contour raster source/layer to MapLibre.
3. Tie contour visibility to `layerVisibility.contours`.
4. Re-register contour layer after basemap/style changes.
5. Keep first-party parcel/drawing layers above the contour overlay.
6. Add concise in-app note: `USGS-derived planning contours; not a survey.`
7. App must pass `pnpm build`.

## Suggested files

Create:

- `src/map/usgsTerrainSources.ts`
- `src/map/terrainLayerManager.ts`

Modify:

- `src/map/QuickMapCanvas.tsx`
- `src/components/LayerPanel.tsx`
- `src/state/quickSiteStore.ts` only if adding opacity/status state is needed.

## Implementation details

### `src/map/usgsTerrainSources.ts`

Export constants for the USGS service URLs. Start with a simple raster tile or WMS URL function. Keep the URL builder isolated so it can be swapped if the first public endpoint needs adjustment.

Suggested API:

```ts
export const USGS_CONTOUR_SOURCE_ID = "usgs-contours";
export const USGS_CONTOUR_LAYER_ID = "usgs-contours-layer";

export function buildUsgsContourRasterSource(): maplibregl.RasterSourceSpecification { ... }
```

### `src/map/terrainLayerManager.ts`

Suggested API:

```ts
export type TerrainOverlayOptions = {
  contoursVisible: boolean;
  contourOpacity?: number;
};

export function registerTerrainOverlays(map: maplibregl.Map, options: TerrainOverlayOptions) { ... }
```

Implementation behavior:

- If source missing, add it.
- If layer missing, add it before parcel/drawing layers where possible.
- If layer exists, update visibility and opacity.
- Do not throw if the map style is not loaded.

### `QuickMapCanvas.tsx`

Import and call `registerTerrainOverlays` inside `syncAppLayers` before `registerMapLayers`:

```ts
registerTerrainOverlays(map, {
  contoursVisible: Boolean(useQuickSiteStore.getState().layerVisibility.contours),
  contourOpacity: 0.65,
});
registerMapLayers(map, layersRef.current);
```

Also ensure style reload/basemap changes still call `syncAppLayers(map)` after the new style loads.

### `LayerPanel.tsx`

Under the contour toggle, add a small muted note:

`USGS-derived planning contours; not a survey.`

## Acceptance criteria

- `pnpm build` passes.
- Toggling contours works without reload.
- Switching basemaps with contours on re-adds the contour overlay.
- Parcel/drawing labels render above contours.
- Contours are not shown by default.
