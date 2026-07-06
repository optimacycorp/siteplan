# Codex Patch 15 - ArcGIS Pro Portfolio Workflow

## Intent

Make SitePlan easy to demo as part of an ArcGIS Pro to ArcGIS Online round-trip workflow.

## Existing anchors

- `src/services/exportService.ts`
- `src/components/ExportSheetPanel.tsx`
- `codex/06_SPRINT_6_ARCGIS_ONLINE_CONNECTOR.md`

## Required changes

1. Add export packaging for:
   - GeoJSON
   - Shapefile-ready ZIP placeholder
   - CSV points
   - metadata JSON
2. Add `docs/arcgis-pro-workflow.md`.
3. Add project metadata fields for:
   - CRS
   - parcel ID
   - jurisdiction
   - source layer
   - date exported
4. Document the round trip:
   - export from SitePlan
   - import into ArcGIS Pro
   - publish to ArcGIS Online
   - re-import hosted layer into SitePlan

## Acceptance checks

- Export artifacts support a clear SitePlan to ArcGIS Pro handoff.
- A reviewer can follow the documented round trip from SitePlan through ArcGIS Online and back.
