# Codex Patch — Sprint 1: Local Field Point Import

## Goal

Add a simple CSV importer for local field points. Imported points should be transformed into lon/lat using a user-defined local origin, units, rotation, and scale factor.

## Constraints

- Keep the MVP simple.
- Do not add State Plane/proj4 in this sprint.
- Do not parse proprietary total-station files yet.
- Use local browser storage via Zustand persist, consistent with current drawing persistence.
- Imported points are planning/exhibit features, not survey-grade control.

## Files to create

- `src/types/fieldPoint.ts`
- `src/utils/fieldPointCsv.ts`
- `src/utils/localCoordinateTransform.ts`
- `src/state/pointImportStore.ts`
- `src/components/PointImportPanel.tsx`
- `src/components/ImportedPointsPanel.tsx`
- `src/state/pointImportStore.test.ts`
- `src/utils/localCoordinateTransform.test.ts`

## Files to modify

- `src/App.tsx`
- `src/map/mapLayers.ts`
- `src/map/mapLayerManager.ts`
- `src/map/QuickMapCanvas.tsx`
- `src/state/quickSiteStore.ts`
- `src/export/exportSession.ts`
- `src/components/LayerPanel.tsx`
- `src/components/PrintPlanSheet.tsx`
- `src/styles.css`

## Implementation details

### 1. Add field point types

Create `src/types/fieldPoint.ts`:

```ts
export type ImportedPoint = {
  id: string;
  pointNumber: string;
  name: string;
  code?: string;
  note?: string;
  northing: number;
  easting: number;
  elevation?: number;
  lng: number;
  lat: number;
  source: "local-csv";
  createdAt: string;
};

export type LocalPointTransform = {
  mode: "local-xy";
  units: "feet" | "meters";
  origin: { lng: number; lat: number; label: string } | null;
  rotationDegrees: number;
  scaleFactor: number;
};

export type ParsedFieldPointRow = {
  pointNumber: string;
  name: string;
  code?: string;
  note?: string;
  northing: number;
  easting: number;
  elevation?: number;
};
```

### 2. Add local transform utility

Create `src/utils/localCoordinateTransform.ts` with a small-area parcel-scale conversion.

Rules:

- `northing` and `easting` are local coordinates.
- convert feet to meters when needed.
- apply `scaleFactor`, default 1.
- rotation is clockwise degrees from local north to map/geodetic north.
- output lon/lat.

Add tests for:

- origin point transforms to origin lon/lat
- northing increases latitude
- easting increases longitude
- feet vs meters conversion
- 90-degree rotation swaps axes in the expected direction

### 3. Add CSV parser

Create `src/utils/fieldPointCsv.ts`.

Requirements:

- Accept comma-separated CSV.
- Support quoted values minimally.
- Header aliases:
  - point: `point`, `pt`, `point_number`, `id`
  - name: `name`, `description`, `desc`
  - northing: `northing`, `north`, `y`, `n`
  - easting: `easting`, `east`, `x`, `e`
  - elevation: `elevation`, `elev`, `z`
  - code: `code`, `feature_code`, `fc`
  - note: `note`, `notes`, `comment`
- Return parsed rows and row-level errors.
- Require numeric northing and easting.

### 4. Add Zustand point import store

Create `src/state/pointImportStore.ts`.

State:

- `transform`
- `previewRows`
- `importedPoints`
- `importError`
- `selectedPointId`

Actions:

- `setTransform(patch)`
- `setOriginFromLngLat(lng, lat, label?)`
- `parseCsvText(text)`
- `previewTransformedPoints()`
- `commitPreviewPoints()`
- `deletePoint(id)`
- `clearPoints()`
- `selectPoint(id | null)`
- `hydrateExportSession({ importedPoints, transform })`

Use `persist` with key `optimacy-quicksite-field-points`.

### 5. Add UI

Create `PointImportPanel`:

- disabled until parcel selected
- origin buttons:
  - Use parcel centroid
  - Use map center
- units select
- rotation input
- scale factor input
- file input / textarea fallback
- preview count
- save imported points button
- warning notice about map/parcel not being survey control

Create `ImportedPointsPanel`:

- list point number, name/code, elevation
- zoom button
- delete button
- clear all button

### 6. Add map layers

Modify `buildMapLayers` input to accept `importedPoints`.

Add features:

- imported point circles
- imported point labels

Label text:

- `${pointNumber} ${name}` trimmed
- include elevation only in panel/export, not on map by default

Add app layer order:

- `imported-points`
- `imported-point-labels`

### 7. Wire into app

Modify `App.tsx`:

- import `PointImportPanel` and `ImportedPointsPanel`
- place `PointImportPanel` after `DrawingToolbar` or before `LayerPanel`
- place `ImportedPointsPanel` in right panel below `FeatureListPanel`

Modify `QuickMapCanvas`:

- read imported points from point store
- pass into `buildMapLayers`
- allow point feature click selection if simple to wire

### 8. Add layer toggle

Modify `quickSiteStore.layerVisibility` to include:

```ts
fieldPoints: true
fieldPointLabels: true
```

Modify `LayerPanel` with toggles:

- Imported points
- Point labels

### 9. Export session

Modify `exportSession.ts` payload to include:

- `importedPoints`
- `pointTransform`

Hydrate on export-only view.

Modify `PrintPlanSheet` details to include:

- point count
- coordinate mode: Local XY
- units
- rotation
- origin label/lon/lat
- disclaimer

## Acceptance criteria

- App builds.
- Existing drawing tools still work.
- User can import sample CSV.
- Points show on map.
- Points persist after refresh.
- Points appear in export preview details.
- Layer toggles hide/show points and labels.
- If origin is missing, preview/import is blocked with a clear warning.
