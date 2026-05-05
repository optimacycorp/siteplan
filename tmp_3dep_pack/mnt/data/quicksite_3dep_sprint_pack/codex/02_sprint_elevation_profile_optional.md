# Codex Patch — Sprint 2 Optional: Elevation Sampling / Terrain Summary

## Intent

After contour overlay works, add a small optional terrain summary. This should not block the MVP and should not be implemented before the visual overlay is stable.

## Requirements

Add a `TerrainSummary` card that appears after a parcel is selected and contours are enabled.

Display:

- Source: USGS 3DEP / The National Map
- Approximate relief: `pending` initially
- Optional: `sample elevation at parcel center`

## Architecture

Prefer a backend/serverless proxy for elevation sampling instead of processing DEMs in the browser.

Create:

- `src/services/elevationService.ts`
- optional `server/usgsElevationProxy.mjs`
- `src/components/TerrainSummary.tsx`

## User-facing wording

Use cautious wording:

`Approximate elevation context from public USGS data. Not survey-grade topo.`

## Acceptance criteria

- Terrain summary never blocks parcel search or drawing.
- Failures show `Terrain summary unavailable` instead of breaking the app.
- Build passes.
- No raw service URLs are scattered across UI components.
