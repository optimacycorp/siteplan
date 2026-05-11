# Codex Patch — Sprint 3: Transform Validation and Two-Point Calibration

## Goal

Improve reliability by adding validation and optional two-point calibration.

## Why

One-origin local import is useful, but two-point calibration lets the app calculate rotation and scale from known pairs.

## Scope

- keep one-origin transform as default
- add optional calibration mode
- show transform QA summary

## Data model additions

```ts
export type ControlPair = {
  id: string;
  localPointNumber: string;
  local: { northing: number; easting: number };
  map: { lng: number; lat: number; label: string };
};
```

Add transform mode:

```ts
calibrationMode: "manual-origin-rotation" | "two-point";
controlPairs: ControlPair[];
```

## Implementation

### 1. Add calibration UI

In `PointImportPanel`:

- choose calibration mode
- Pair A: select imported point + map coordinate
- Pair B: select imported point + map coordinate
- calculate rotation and scale
- allow user to accept calculated transform

### 2. QA summary

Display:

- origin point
- rotation
- scale factor
- distance between control pair in local system
- distance between control pair on map
- difference

### 3. Warnings

Show warnings when:

- origin is missing
- control pair distance is too short, e.g. under 20 ft
- scale factor is suspicious, e.g. outside 0.95 to 1.05 for a local map fit
- transformed points are more than a set distance from selected parcel

## Acceptance criteria

- User can still use simple local import.
- User can optionally calculate transform from two control pairs.
- App shows clear warnings instead of silently accepting questionable transforms.
