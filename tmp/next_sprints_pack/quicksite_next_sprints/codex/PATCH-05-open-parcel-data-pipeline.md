# Codex Patch 05 - Open Parcel Data Pipeline

## Intent

Continue the move away from Regrid by making the local/Supabase parcel provider easier to operate, diagnose, and trust for Colorado Springs / El Paso County target areas.

## Files to modify

- `server/openParcelProxy.mjs`
- `server/parcelProviders/localPostgisProvider.mjs`
- `scripts/parcel-loaders/load-el-paso-county-parcels.mjs`
- `scripts/parcel-loaders/load-colorado-springs-target-areas.mjs`
- `docs/open-parcel-migration.md`
- `supabase/migrations/*open_parcel*.sql`

## Add files

- `docs/parcel-data-runbook.md`
- `server/parcelDiagnostics.mjs`
- `scripts/parcel-loaders/verify-target-area.mjs`

## Implementation steps

### 1. Add import run visibility

If not already fully implemented in the database schema, add/confirm an `open_parcel_import_runs` table with:

- id
- source_key
- preset/group
- started_at
- finished_at
- status
- attempted_count
- inserted_count
- updated_count
- skipped_count
- error_message

Expose debug endpoint:

```http
GET /debug/import-runs?limit=10
```

Return recent import runs as JSON.

### 2. Add search diagnostics endpoint

Add endpoint:

```http
GET /debug/search-diagnostics?query=...
```

Return:

- parsed query type: address, APN, coordinate, unknown.
- normalized tokens.
- local text matches.
- local APN/id matches.
- geocode candidates.
- nearby parcel candidates.
- selected ranking explanation.

This should be safe for development use. If deployed publicly, restrict or hide later.

### 3. Improve candidate ranking

In local provider ranking:

Prefer in this order:

1. Exact APN/parcel id match.
2. Point containment match.
3. Address number + street match.
4. Nearby centroid distance.
5. Area/acreage sanity penalty for very large candidates.

Return ranking metadata in debug mode only.

### 4. Add target area verification script

Create `scripts/parcel-loaders/verify-target-area.mjs` that accepts:

```bash
node scripts/parcel-loaders/verify-target-area.mjs --around 38.878370,-104.897322 --radius-meters 250
node scripts/parcel-loaders/verify-target-area.mjs --parcel-id 7333200002
```

It should report:

- candidate count.
- whether target parcel exists.
- bounds coverage.
- whether geometries are valid enough for frontend display.

### 5. Document operator workflow

Create `docs/parcel-data-runbook.md` with:

- How to load core Rampart/Cedar Heights presets.
- How to verify imports.
- How to debug a failed search.
- How to temporarily enable Regrid fallback.
- How to keep fallback disabled by default.

## Acceptance criteria

- Developer can run a target-area import and verify coverage with one documented sequence.
- Search diagnostics explains why a parcel was or was not selected.
- Local provider is the default path.
- Regrid fallback remains optional and disabled unless explicitly enabled.

## Non-goals

- Do not build national parcel coverage yet.
- Do not add paid provider abstraction UI.
- Do not block frontend beta on perfect data coverage outside target areas.
