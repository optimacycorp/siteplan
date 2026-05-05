# Optimacy QuickSite — 3DEP + Contours Sprint Pack

Purpose: add USGS 3DEP-derived contours and optional elevation context to the stripped-down QuickSite MVP without turning the product back into a complex GIS workbench.

Recommended implementation path:

1. Add a simple USGS contour raster/WMS overlay first.
2. Add parcel-bounded DEM/elevation sampling only after the visual contour overlay works.
3. Keep all controls behind one concise panel: `Terrain`.
4. Export contours exactly as visible on the map, with a clear planning-use disclaimer.

This pack includes:

- `docs/3dep-design.md` — design and architecture.
- `docs/assessment.md` — WIP assessment and product guidance.
- `docs/qa-checklist.md` — manual and technical QA.
- `codex/01_sprint_terrain_overlay.md` — primary Codex implementation patch prompt.
- `codex/02_sprint_elevation_profile_optional.md` — optional follow-on for elevation sampling/profile.
- `codex/03_sprint_export_and_disclaimer.md` — export/title-block polish.
- `patches/terrain-overlay-unified-diff.md` — concrete patch target guidance for current files.

