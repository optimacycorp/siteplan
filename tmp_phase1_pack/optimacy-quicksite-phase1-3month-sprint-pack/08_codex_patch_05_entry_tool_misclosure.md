# Codex Patch 05 — Entry Tool / Misclosure Wedge

Objective: Typed deed-call traverse with misclosure.

Tasks:
1. Add `src/domain/traverse/bearingParser.ts`, `traverseEngine.ts`, `misclosure.ts`.
2. Add `EntryToolPanel`.
3. Support quadrant bearings and distances in feet.
4. Plot local traverse at selected parcel centroid.
5. Show misclosure distance, closing vector, closure ratio, and closing wedge.
6. Add warnings: approximate, not a boundary survey.
7. Add tests/fixtures: square, rectangle, open traverse.

Acceptance:
- Calls plot.
- Misclosure calculates.
- Bad bearings show validation errors.
