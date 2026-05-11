# Codex Patch — Sprint 4: Coordinate System Foundation

## Goal

Prepare the app for State Plane import without implementing a risky full CRS system prematurely.

## Scope

- add CRS metadata panel
- add curated CRS registry placeholder
- add proj4 dependency only if implementing actual EPSG conversion in this sprint
- keep local import fully working

## Recommended package

```bash
pnpm add proj4
```

## Files

- `src/types/coordinateSystem.ts`
- `src/data/coordinateSystems.ts`
- `src/utils/projectedCoordinateTransform.ts`
- `src/components/CoordinateSystemPanel.tsx`

## CRS metadata type

```ts
export type CoordinateSystemMetadata = {
  mode: "local-xy" | "projected";
  label: string;
  epsg?: string;
  datum?: string;
  units: "meters" | "international-feet" | "us-survey-feet";
  verticalDatum?: string;
  notes?: string;
};
```

## Curated CRS registry

Start with placeholders and require explicit confirmation:

- WGS84 lon/lat display target
- Colorado State Plane legacy zones as future entries
- Georgia State Plane zones as future entries

Do not expose every EPSG code in a search box yet. That invites user error.

## UX rule

When mode is `projected`, show this warning:

> Projected coordinate import requires the correct CRS, datum, and units. Incorrect selections can move points by large distances. Use this only when the source coordinate system is known.

## Acceptance criteria

- Local import remains default.
- CRS metadata can be stored with the import.
- Export prints CRS metadata.
- If proj4 conversion is not complete, projected import must stay disabled.
