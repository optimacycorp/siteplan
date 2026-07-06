# Codex Patch 14 - SQL Server Compatibility Layer

## Intent

Demonstrate enterprise spatial portability by generating SQL Server-compatible artifacts without replacing PostGIS as the primary backend.

## Existing anchors

- `codex/07_SPRINT_7_POSTGIS_GEODATABASE.md`
- `src/services/exportService.ts`
- `docs/`

## Required changes

1. Add `docs/sql-server-spatial-compatibility.md`.
2. Add `database/sqlserver/siteplan_spatial_schema.sql`.
3. Include compatibility tables for projects, layers, and features with geometry or geography columns.
4. Add an export function that converts project GeoJSON into SQL Server insert statements.
5. Make it explicit in docs that PostGIS remains the primary runtime.

## Acceptance checks

- The repo includes a documented SQL Server spatial schema.
- App or script output can generate SQL Server-compatible inserts for project features.
- Docs clearly frame this as compatibility and portfolio evidence, not a backend swap.
