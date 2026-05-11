# Points Import Architecture

## MVP user workflow

Add a new panel between drawing tools and layer controls:

**4. Import field points**

Flow:

1. Choose CSV file.
2. Confirm column mapping.
3. Choose coordinate mode:
   - Local XY, feet
   - Local XY, meters
4. Choose origin:
   - use parcel centroid
   - click map origin
   - manually enter lon/lat
5. Enter rotation angle:
   - default `0°`
   - positive clockwise from local north to map north
6. Preview imported points.
7. Save imported points to the plan.

## CSV schema

Minimum supported columns:

```csv
point,name,northing,easting,elevation,code,note
1,CP1,0,0,6120.55,CTRL,Origin control point
2,Bldg NW,52.10,-20.00,6121.02,BLDG,Proposed corner
```

Aliases should be accepted:

- point: `point`, `pt`, `point_number`, `id`
- name: `name`, `description`, `desc`
- northing: `northing`, `north`, `y`, `n`
- easting: `easting`, `east`, `x`, `e`
- elevation: `elevation`, `elev`, `z`
- code: `code`, `feature_code`, `fc`
- note: `note`, `notes`, `comment`

## Data model

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
```

## Store

Create `src/state/pointImportStore.ts` using Zustand persistence:

- transform
- importedPoints
- importPreviewRows
- importError
- visibility flags
- actions:
  - `setTransform`
  - `parseCsvText`
  - `previewImportedPoints`
  - `commitImportedPoints`
  - `deleteImportedPoint`
  - `clearImportedPoints`
  - `hydrateExportSession`

## Transform math

For local MVP display, use a small-area approximation around the origin:

- convert local units to meters
- apply rotation
- convert meters north/east to lat/lng delta using local latitude

This is not a replacement for State Plane/proj4 conversion, but it is adequate for parcel-scale planning exhibits when clearly labeled.

## Map layers

Add layers:

- `imported-points` circle layer
- `imported-point-labels` symbol layer

Layer order should be above drawings/parcel but below selected vertices if editing remains active.

## Export

Add imported points to export session payload and print details:

- source: Local CSV
- units
- origin
- rotation
- point count
- disclaimer
