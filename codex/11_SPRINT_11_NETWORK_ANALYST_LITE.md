# Codex Patch 11 - Network Analyst Lite

## Intent

Add lightweight access and route analysis that supports site review without committing to a full enterprise routing stack.

## Existing anchors

- `src/components/TerrainSummary.tsx`
- `server/`
- `supabase/migrations/`
- `codex/10_SPRINT_10_EVIDENCE_ENGINE.md`

## Required changes

1. Add `docs/network-analysis-plan.md`.
2. Add database tables:
   - `road_edges`
   - `road_nodes`
   - `access_routes`
3. Add `server/networkProxy.mjs`.
4. Add `src/modules/network/NetworkAnalysisPanel.tsx`.
5. Support MVP tools:
   - drive distance to parcel
   - nearest fire station placeholder
   - route length
   - slope or grade warning when terrain is available
6. Add an Esri Network Analyst comparison note for portfolio context.

## Implementation notes

- Prefer pgRouting-first planning in docs and schema.
- Keep any external routing service integration optional for later.
- Store analysis output as project evidence where appropriate.

## Acceptance checks

- User can select a parcel and calculate basic route or access metrics.
- Network results are reviewable in the UI and attributable as project evidence.
