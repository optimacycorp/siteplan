# Codex Patch 06 — Deed Text to Sketch Plat

Objective: Conservative parser for simple legal description line calls.

Tasks:
1. Add deed text input inside Entry Tool.
2. Extract bearings, distances, and units from simple line calls.
3. Flag unsupported curves, exceptions, monument calls, adjoiners, aliquot descriptions, and basis-of-bearing statements.
4. Generate editable calls table.
5. Plot after user review.
6. Export sketch + calls table + misclosure summary.

Acceptance:
- Simple metes-and-bounds text becomes editable calls.
- Unsupported text is not silently ignored.
- Export includes calls table.
