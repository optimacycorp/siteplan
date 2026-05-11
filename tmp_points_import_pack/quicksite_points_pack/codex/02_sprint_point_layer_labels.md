# Codex Patch — Sprint 2: Point Labels, Symbology, and Field Usability

## Goal

Make imported field points usable on the map and in the plan output.

## Scope

- selectable imported points
- style by code
- label options
- quick conversion of selected points into drawing features

## Implementation

### 1. Point label settings

Add to `pointImportStore`:

```ts
labelMode: "point-name" | "point-code" | "point-elevation" | "point-name-elevation";
```

Default: `point-name`.

Add controls in `PointImportPanel` or `ImportedPointsPanel`.

### 2. Style by code

In `mapLayers.ts`, assign symbol properties:

- `CTRL` = control point
- `BLDG` = building point
- `DRIVE` = driveway point
- `UTIL` = utility point
- default = field point

Keep colors simple and use existing visual style. Do not overdo survey symbology yet.

### 3. Selection behavior

In `QuickMapCanvas`, make `imported-points` interactive:

- click imported point selects it
- selected point gets larger circle / highlighted stroke
- Properties panel or ImportedPointsPanel shows details

### 4. Convert selected points into features

Add buttons:

- selected BLDG points -> Structure polygon
- selected DRIVE points -> Driveway line
- selected UTIL points -> Easement/utility line

For this sprint, use a simple multi-select list in `ImportedPointsPanel` rather than map lasso selection.

## Acceptance criteria

- Imported points are easy to see and identify.
- Labels can be simplified when cluttered.
- User can select several imported points and create a drawing feature.
- Existing drawing persistence remains unaffected.
