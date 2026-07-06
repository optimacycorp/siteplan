# Codex Patch 10 - Evidence and Revision Intelligence

## Intent

Make every warning traceable to source evidence so the app explains conflicts as due diligence findings instead of opaque automation.

## Existing anchors

- `codex/07_SPRINT_7_POSTGIS_GEODATABASE.md`
- `codex/09_SPRINT_9_CONSTRAINT_ENGINE.md`
- `src/components/FeatureListPanel.tsx`
- `src/services/exportService.ts`

## Required changes

1. Create `src/modules/evidence/`.
2. Add `src/modules/evidence/EvidencePanel.tsx`.
3. Add an evidence object model with:
   - `issue_id`
   - `source_type`
   - `source_name`
   - `authority_level`
   - `confidence`
   - `geometry`
   - `date_observed`
   - `recommended_action`
4. Support conflict examples:
   - parcel GIS vs survey
   - deed vs assessor
   - ROW width mismatch
   - setback conflict
   - easement encroachment
5. Add export support for a due diligence findings report.

## UX requirements

- Constraint issues should link directly to supporting evidence.
- Evidence entries should explain the conflict between named sources.
- The panel should support reviewer-friendly summaries and next actions.

## Acceptance checks

- Every warning displayed to the user links back to one or more source records.
- Findings can be exported without "AI says" phrasing.
