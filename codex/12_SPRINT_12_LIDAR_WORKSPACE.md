# Codex Patch 12 - 3D Dataset and LiDAR Workspace

## Intent

Prepare SitePlan for point-cloud-driven workflows without blocking on a full 3D viewer implementation.

## Existing anchors

- `src/components/ImportedPointsPanel.tsx`
- `src/types/fieldPoint.ts`
- `codex/07_SPRINT_7_POSTGIS_GEODATABASE.md`

## Required changes

1. Create `src/modules/lidar/`.
2. Add `src/modules/lidar/PointCloudImportPanel.tsx`.
3. Support metadata capture for:
   - LAS or LAZ filename
   - coordinate system
   - scan date
   - scanner
   - control point notes
4. Add `docs/point-cloud-viewer-options.md` comparing Potree and Cesium.
5. Add a placeholder route for `/project/:id/point-clouds`.
6. Add feature extraction schema support for:
   - buildings
   - roof planes
   - walls
   - equipment
   - culverts
   - berms
   - utilities
7. Store extracted or digitized objects as `project_features`.

## UX requirements

- User can register a scan before any heavy processing is available.
- Metadata entry should make it obvious that full 3D viewing is a later milestone.

## Acceptance checks

- A scan can be attached to a project with complete metadata.
- Extracted 3D objects can be represented as standard project features.
