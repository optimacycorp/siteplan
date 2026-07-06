# Codex Patch 13 - Business Analyst and EMSI Panel

## Intent

Add portfolio-grade demographic and labor analysis inputs that contribute to site suitability review.

## Existing anchors

- `src/components/ParcelSummary.tsx`
- `src/components/TerrainSummary.tsx`
- `src/utils/fieldPointCsv.ts`
- `codex/09_SPRINT_9_CONSTRAINT_ENGINE.md`

## Required changes

1. Create `src/modules/business/`.
2. Add `src/modules/business/BusinessAnalysisPanel.tsx`.
3. Add a data model for:
   - trade area
   - drive-time area
   - population
   - jobs
   - income
   - industry codes
   - labor market notes
4. Add `docs/emsi-lightcast-data-plan.md`.
5. Support manual CSV import first.
6. Leave Lightcast or EMSI API integration as a later extension.
7. Add suitability score inputs for:
   - access
   - slope
   - zoning
   - utilities
   - flood
   - labor market
   - nearby services

## Acceptance checks

- User can upload demographic or labor CSV data and associate it with a parcel or project.
- App can generate a simple suitability summary from the imported inputs.
