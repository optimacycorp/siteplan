# Codex Patch 03 - Measurements and Drawing Polish

## Intent

Make drawing features useful for planning exhibits by adding approximate measurements, better editing controls, and recovery actions.

## Files to modify

- `src/state/drawingStore.ts`
- `src/components/DrawingToolbar.tsx`
- `src/components/PropertiesPanel.tsx`
- `src/map/mapLayers.ts`
- `src/types/drawing.ts`
- `src/map/QuickMapCanvas.tsx`
- `src/styles.css`

## Add files

- `src/utils/measurements.ts`
- `src/components/MeasurementSummary.tsx`

## Implementation steps

### 1. Add measurement helpers

Create `src/utils/measurements.ts` with:

- `feetBetweenPoints(a, b)` using haversine or local approximation.
- `lineLengthFeet(points)`.
- `polygonAreaSqft(points)`.
- `formatFeet(value)`.
- `formatArea(valueSqft)`.
- `midpoint(points)` for line labels.

For MVP, approximate calculations are acceptable. Include comments that values are planning-level only.

### 2. Extend drawing feature metadata

In `types/drawing.ts`, add optional fields:

```ts
notes?: string;
showLabel?: boolean;
```

Keep the model simple. Do not add complicated styles yet.

### 3. Display measurement summaries

In `PropertiesPanel` and drawing list cards:

- Structure polygon: show approximate square feet and acres.
- Driveway/easement/dimension line: show approximate feet.
- Label point: show “Point label.”

Add `MeasurementSummary` component that accepts a drawing feature.

### 4. Add dimension labels on map

In `mapLayers.ts`, create a symbol layer for dimension labels:

- Source: `dimension-labels`
- Features generated from `dimension-line` drawings only.
- Geometry: midpoint of line points.
- Property: formatted length, e.g. `124 ft ±`.

Add layer after `drawing-lines` and before/with `drawing-labels`.

### 5. Improve drawing controls

In `drawingStore`, add:

- `undoLastFeature()`
- `clearAllDrawings()`
- `cancelActiveSketch()`

In `DrawingToolbar`, add buttons:

- Cancel sketch
- Undo last feature
- Clear all drawings

Show destructive clear action with a confirm prompt.

### 6. Keyboard support

In `QuickMapCanvas`, add document-level keydown listener:

- `Escape`: cancel active sketch and return to select mode.
- `Backspace` or `Delete`: delete selected feature when not focused on input/textarea.

Be careful not to capture keys while typing in inputs.

### 7. Improve double-click completion

The current double-click completion should remain, but prevent the second click from adding an extra unwanted vertex. If needed, on double-click remove the last point if it duplicates the double-click point within a tiny tolerance.

## Acceptance criteria

- Each feature card shows useful measurement information.
- Dimension lines display length labels on the map.
- Escape cancels active drawing.
- Delete removes selected drawing when focus is not in an input.
- Clear-all requires confirmation.
- Measurements are clearly marked approximate.

## Non-goals

- No CAD snapping.
- No bearing/distance legal-description drafting.
- No survey-grade measurement claims.
