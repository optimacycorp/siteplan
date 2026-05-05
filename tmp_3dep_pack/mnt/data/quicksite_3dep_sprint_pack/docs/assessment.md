# Current WIP Assessment Before 3DEP Integration

The MVP is in a good position to add terrain/contour support because the map code is already cleanly separated from the main UI:

- `QuickMapCanvas.tsx` owns MapLibre initialization and style reload behavior.
- `LayerPanel.tsx` already has a placeholder `contours` toggle.
- `quickSiteStore.ts` already has `layerVisibility.contours`.
- `mapLayerManager.ts` handles first-party GeoJSON layers but does not yet support raster/tile overlays.
- Export state already preserves layer visibility, which is important for print output.

The main product risk is complexity. Terrain should not become a GIS submenu with too many layer choices. For this MVP, use one simple user-facing concept:

> Terrain / Contours

Suggested product rule:

- Default off.
- User turns on contours only when needed.
- Show one small note: `Contours are public USGS-derived planning data and are not a field survey.`
- Do not expose projection, WMS, DEM resolution, image server, or contour-function language in the main UI.

Recommended implementation order:

1. Sprint A: USGS contour visual overlay.
2. Sprint B: Export and print reliability.
3. Sprint C: Optional elevation profile/slope helper.
4. Sprint D: Optional cache/proxy if direct public services prove slow or blocked.

Do not start by generating custom contour vectors on the client. That is overkill for the MVP and will create reliability/performance issues.
