# 3DEP + Contours MVP Design

## Goal

Add trusted public terrain context to QuickSite so a user can quickly see site slope and general contour relationships while preparing a conceptual planning exhibit.

## Data source strategy

Use USGS/The National Map services first:

- 3DEP Elevation ImageServer supports visualization functions including hillshade, slope, tinted hillshade, and contour output.
- The National Map contours MapServer/WFS provides USGS contour lines at multiple scales, with data refreshed recently.

## MVP architecture

### Phase 1: Visual overlay

Add a raster/tile overlay for contours. The overlay should be controlled by existing `layerVisibility.contours`.

Recommended source options:

1. ArcGIS export/tile-style contour overlay if stable in MapLibre.
2. WMS overlay from the 3DEP ImageServer with the contour rendering function if CORS and URL templating work.
3. Server proxy endpoint only if direct browser loading is blocked or too slow.

### Phase 2: Terrain panel

Create a small `TerrainPanel` or fold into `LayerPanel`:

- Toggle: `Contours`
- Optional toggle: `Hillshade`
- Optional select: `Contour emphasis` with `Planning`, `Light`, `Strong`
- Note: `USGS-derived planning layer; not a survey.`

Keep this separate from the core draw toolbar.

### Phase 3: Export

Export should include visible contours as part of the map capture. Add a title-block note:

`Contours/elevation context shown from public USGS 3DEP/The National Map sources. For planning only; verify with survey-grade field data where required.`

### Phase 4: Optional elevation helper

After overlay works, add a simple `Terrain info` card:

- Approximate minimum elevation on parcel.
- Approximate maximum elevation on parcel.
- Approximate relief.
- Optional drawn-line elevation profile.

This should use a backend proxy or serverless function, not client-heavy DEM processing.

## Technical design

### New files

- `src/map/usgsTerrainSources.ts`
- `src/map/terrainLayerManager.ts`
- `src/components/TerrainPanel.tsx`
- Optional: `src/services/elevationService.ts`
- Optional: `server/usgsTerrainProxy.mjs`

### Store changes

Extend `quickSiteStore.ts` with:

```ts
terrainSettings: {
  contourOpacity: number;
  hillshade: boolean;
  sourceStatus: "idle" | "loading" | "ready" | "error";
  sourceMessage: string;
}
setTerrainSettings(...)
```

For Sprint A, only `contourOpacity` is essential.

### MapLibre strategy

Because the current app rebuilds style when the basemap changes, terrain overlays must be re-added after style load. The correct hook is the same place app layers are synced:

- On initial map `load`.
- After basemap/style changes.
- After `layerVisibility.contours` changes.

The existing `registerMapLayers` handles GeoJSON only. Add a separate raster overlay manager instead of forcing raster layers into the existing GeoJSON descriptor model.

## UX guardrails

- Keep terrain under `Advanced map layers` or a single `Terrain` block.
- Default to off.
- Do not require account/API keys for the first version.
- Do not market this as engineering-grade topo.
- Export should include attribution/disclaimer.
