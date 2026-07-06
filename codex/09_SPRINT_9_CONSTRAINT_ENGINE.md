# Codex Patch 09 - Site Constraint Engine

## Intent

Turn SitePlan into a rules-based site review tool that evaluates proposed geometry against parcel and site constraints.

## Existing anchors

- `src/components/DrawingToolbar.tsx`
- `src/components/FeatureListPanel.tsx`
- `src/components/PropertiesPanel.tsx`
- `src/services/terrainService.ts`
- `src/types/drawing.ts`

## Required changes

1. Create `src/modules/constraints/`.
2. Add `src/services/constraintEngine.ts`.
3. Add `src/modules/constraints/ConstraintResultsPanel.tsx`.
4. Support constraint types:
   - setback
   - easement encroachment
   - parcel boundary conflict
   - floodplain overlap
   - slope warning
   - ROW conflict
   - lot coverage
5. Use deterministic geometry checks and measurable thresholds.
6. Add issue severities: `info`, `warning`, `critical`.

## Result requirements

Every issue must include:

- geometry involved
- rule source
- measurement
- confidence
- recommended next action

## Acceptance checks

- A drawn building footprint can be checked against parcel boundary and setback buffers.
- Results render in a review panel and can be highlighted on the map.
- The UI avoids vague "AI says" language and instead cites the violated rule or comparison.
