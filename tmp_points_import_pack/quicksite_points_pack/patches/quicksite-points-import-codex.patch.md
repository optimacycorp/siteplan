# Consolidated Codex Patch Instructions — Points Import

Use this as a single implementation prompt if you want Codex to apply the work in one branch.

```text
You are working in the Optimacy QuickSite React/Vite/TypeScript MVP.

Implement a local coordinate field point import system. Keep the MVP simple and do not add full State Plane/proj4 conversion in this patch.

Existing architecture notes:
- App shell is in src/App.tsx.
- Map canvas is src/map/QuickMapCanvas.tsx.
- Map layers are built in src/map/mapLayers.ts and registered in src/map/mapLayerManager.ts.
- Drawings are stored in src/state/drawingStore.ts.
- QuickSite session state is in src/state/quickSiteStore.ts.
- Export session is src/export/exportSession.ts.
- Existing drawings use LngLatPoint = { lng, lat }.

Create:
- src/types/fieldPoint.ts
- src/utils/fieldPointCsv.ts
- src/utils/localCoordinateTransform.ts
- src/state/pointImportStore.ts
- src/components/PointImportPanel.tsx
- src/components/ImportedPointsPanel.tsx
- tests for parser/transform/store where feasible

Add:
- CSV import for point,name,northing,easting,elevation,code,note with aliases.
- Local transform with units feet/meters, origin lon/lat, rotationDegrees, scaleFactor.
- Imported points persisted with Zustand.
- Map point layer and point label layer.
- Layer toggles fieldPoints and fieldPointLabels.
- Export session hydration for imported points and transform.
- Print sheet summary of imported points and transform.
- Clear disclaimers: planning/exhibit only, not survey-grade unless tied to verified control.

Acceptance:
- npm/pnpm build passes.
- Existing drawing tools continue working.
- sample_local_points.csv imports and displays.
- Refresh preserves imported points.
- Export preview includes imported points.
```

## Suggested implementation order

1. Types and transform utility.
2. CSV parser.
3. Zustand store.
4. Import panel.
5. Map layers.
6. Export session.
7. Print details.
8. QA and tests.
