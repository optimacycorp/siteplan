# Codex Patch 02 - Drawing and Measurement Tools

## Intent

Add basic drawing tools needed for a planning exhibit.

## Add

- `src/components/DrawingToolbar.tsx`
- `src/state/drawingStore.ts`
- `src/types/drawing.ts`
- Map click handling in `QuickMapCanvas`
- Drawing layer generation in `mapLayers.ts`
- Local draft persistence

## Drawing modes

- `select`
- `structure-polygon`
- `driveway-line`
- `easement-line`
- `dimension-line`
- `label-point`

## User flow

1. Select a drawing mode.
2. Click map to place vertices/points.
3. Double-click or toolbar button completes the active feature.
4. Feature appears in map layers.
5. Select feature to rename/delete.

## Minimal calculations

Add helpers:

- approximate line length in feet
- approximate polygon area in square feet/acres

For MVP, use Turf later if needed; initial implementation can use simple Web Mercator/local approximations with disclaimer.

## Acceptance checks

- Drawings persist in localStorage.
- User can draw at least one polygon, one line, and one label.
- User can delete selected drawing.
- Drawing state is independent from parcel state.
