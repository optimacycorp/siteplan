# Codex Patch 07 - PostGIS Geodatabase Layer Model

## Intent

Introduce a real project-layer-feature schema so SitePlan can persist spatial work with traceable sources.

## Existing anchors

- `supabase/migrations/`
- `server/`
- `src/services/exportService.ts`
- `src/state/quickSiteStore.ts`

## Required changes

1. Add a migration named `supabase/migrations/YYYYMMDD_geodatabase_layers.sql`.
2. Create tables:
   - `projects`
   - `project_layers`
   - `project_features`
   - `feature_sources`
   - `spatial_evidence`
3. Add geometry columns:
   - `geometry geometry(Geometry, 4326)`
   - `raw_geometry jsonb`
4. Add indexes for geometry, project id, and layer type.
5. Keep the schema RLS-safe, but simple enough for local development.
6. Add `server/geodatabaseProxy.mjs` for project and feature read/write operations.

## Data requirements

- Every stored feature must retain source attribution such as user draw, parcel provider, ArcGIS, survey, or imported GIS file.
- Layer records should preserve display metadata needed by the frontend.

## Acceptance checks

- Features can be stored and retrieved by project id.
- Stored records keep both normalized geometry and raw imported geometry.
- Source attribution is queryable for each feature.
