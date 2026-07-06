# Codex Patch 06 - ArcGIS Online Connector

## Intent

Connect SitePlan to public ArcGIS REST layers so the app can ingest hosted GIS data without manual conversion.

## Existing anchors

- `src/data/providers/parcels/`
- `src/services/openParcelService.ts`
- `src/components/LayerPanel.tsx`
- `src/state/quickSiteStore.ts`
- `codex/05_SPRINT_5_GIS_DATA_MANAGER.md`

## Required changes

1. Add environment variables to `.env.example` and README:
   - `VITE_ARCGIS_PORTAL_URL=https://www.arcgis.com`
   - `VITE_ARCGIS_CLIENT_ID=`
2. Create `src/services/arcgisService.ts`.
3. Add public ArcGIS REST metadata loading.
4. Add ArcGIS FeatureServer and MapServer layer import as GeoJSON.
5. Create `src/modules/gisData/ArcGISLayerImportPanel.tsx`.
6. Persist the source URL in `src/state/gisLayerStore.ts`.
7. Add `docs/arcgis-online-integration.md`.

## UX requirements

- User can paste a FeatureServer or MapServer layer URL.
- Metadata preview shows layer name, geometry type, object id field, and spatial reference before import.
- Failed ArcGIS requests surface clear service or CORS errors.

## Acceptance checks

- Public ArcGIS REST layer metadata loads from a pasted URL.
- Features import into the GIS layer store and render on the map.
- Imported ArcGIS layers can be toggled and exported like other GIS layers.
