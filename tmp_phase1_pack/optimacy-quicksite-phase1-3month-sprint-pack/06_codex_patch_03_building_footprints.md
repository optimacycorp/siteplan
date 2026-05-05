# Codex Patch 03 — Building Footprints

Objective: Auto-load existing building footprints.

Tasks:
1. Add `src/data/providers/buildings/types.ts`.
2. Add provider method `findBuildingsForBbox(bbox)`.
3. Start with Overture/OSM/county provider if practical; otherwise fixture-backed provider with TODO for live source.
4. Render nearby buildings and highlight those intersecting selected parcel.
5. Add Buildings toggle and source note.
6. Include building source note in export.

Acceptance:
- Footprints render from live source or fixture.
- Intersecting buildings are detected.
- Toggle and export note work.
