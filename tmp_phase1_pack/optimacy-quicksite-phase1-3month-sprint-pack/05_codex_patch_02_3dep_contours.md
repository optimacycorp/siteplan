# Codex Patch 02 — 3DEP Contours

Objective: Finish USGS 3DEP/The National Map contours as an optional overlay.

Tasks:
1. Add `src/data/providers/terrain/usgs3dep.ts`.
2. Add MapLibre raster source/layer for USGS contour MapServer/tile endpoint.
3. Wire to existing contours toggle.
4. Add opacity if UI supports it.
5. Persist visibility preference.
6. Add export note: “Contours shown from USGS 3DEP/The National Map where available. Planning exhibit only.”

Acceptance:
- Toggle works.
- App does not crash if USGS service fails.
- Export includes source/disclaimer when enabled.
