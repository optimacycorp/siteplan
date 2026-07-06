# Codex Patch 05 - GIS Data Manager

## Intent

Add a GIS import/export workspace so SitePlan can load project context beyond parcel fixtures and drawing tools.

## Existing anchors

- `src/components/PointImportPanel.tsx`
- `src/utils/fieldPointCsv.ts`
- `src/state/quickSiteStore.ts`
- `src/map/QuickMapCanvas.tsx`
- `src/types/fieldPoint.ts`

## Required changes

1. Create `src/modules/gisData/`.
2. Add `src/modules/gisData/GisDataPanel.tsx` for file upload, layer list, CRS warnings, and export actions.
3. Add `src/services/gisImportService.ts`.
4. Add `src/types/gisLayer.ts`.
5. Add `src/state/gisLayerStore.ts`.
6. Render imported GIS layers in `src/map/QuickMapCanvas.tsx`.
7. Add GeoJSON export for drawn features plus imported layers.

## Import scope

- Parse GeoJSON in-browser.
- Accept CSV point uploads using the existing point import utilities where practical.
- Stub KML, Shapefile, and DXF-lite with clear "server processing required" messaging until the worker exists.

## UX requirements

- Imported layers show name, source type, feature count, visibility, and warnings.
- Invalid files show friendly error messages without breaking the map.
- CRS uncertainty is visible to the user instead of silently accepted.

## Acceptance checks

- User can upload a GeoJSON file and see it on the map.
- User can upload a CSV point file and see points as a GIS layer.
- User can export current drawn features and imported layers as GeoJSON.
- Unsupported formats fail gracefully with actionable messaging.
