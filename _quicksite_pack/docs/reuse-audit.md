# Reuse Audit from Uploaded Land Portal Codebase

## Summary

You can reuse a meaningful amount of the current codebase, but not as-is. The best path is to extract the mapping, parcel, overlay, UI, and geometry foundations while leaving behind the heavier project/title/subdivision workflow.

Estimated reuse:

- 60-70% reusable with light adaptation: MapLibre map foundation, layer manager, basemap registry, Regrid proxy client, shared UI primitives, loading states, terrain preview interfaces, overlay settings pattern.
- 30-40% reusable with heavier adaptation: parcel selection state, project map page logic, design console SVG helpers, site-planner package utilities.
- 0-15% reuse for the new MVP: title commitment workflow, document import, admin screens, advanced project workflow shell, subdivision/yield pages, Supabase membership/admin model.

## Reuse directly or nearly directly

### MapLibre foundation
Source candidates:

- `apps/web/src/modules/map/BaseMapCanvas.tsx`
- `apps/web/src/modules/map/MapLayerManager.ts`
- `apps/web/src/modules/map/mapProviderRegistry.ts`
- `apps/web/src/modules/map/BaseMapCanvas.module.css`

Use these as the core map renderer. Rename to:

- `src/map/QuickMapCanvas.tsx`
- `src/map/mapLayerManager.ts`
- `src/map/basemapRegistry.ts`

Changes:

- Remove project-specific props.
- Add simpler `selectedParcel`, `drawFeatures`, `referenceLayers`, and `onMapClick` props.
- Add satellite/aerial basemap option.
- Keep MapLibre layer descriptors.

### Regrid parcel service
Source candidate:

- `apps/web/src/modules/parcel/regridParcelService.ts`

Reuse this almost directly. Rename to:

- `src/services/regridParcelService.ts`

Changes:

- Keep search, point select, detail, neighbors, and tilejson functions.
- Make `VITE_REGRID_PROXY_BASE_URL` required in `.env.example`.
- Keep provider-specific logic isolated behind a service interface so Regrid can be swapped later.

### UI primitives
Source candidates:

- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Field.tsx`
- `apps/web/src/components/feedback/LoadingState.tsx`

Reuse after renaming CSS classes as needed.

### Overlay settings pattern
Source candidates:

- `apps/web/src/modules/overlays/useOverlaySettings.ts`
- `apps/web/src/modules/overlays/OverlayPanel.tsx`
- `apps/web/src/modules/overlays/OverlayGroupSection.tsx`

Reuse the pattern, but simplify layers to:

- Parcel boundary
- Adjoining parcels
- Buildings
- Contours
- Setbacks
- Drawings
- Labels/dimensions

## Adapt carefully

### Parcel page logic
Source candidates:

- `apps/web/src/modules/parcel/ProjectParcelPage.tsx`
- `apps/web/src/modules/parcel/useRegridParcels.ts`
- `apps/web/src/modules/parcel/useProjectParcelSelection.ts`
- `apps/web/src/modules/parcel/activeParcelAnchor.ts`

Do not copy the big `ProjectParcelPage.tsx` directly. Instead extract:

- Search box behavior
- Regrid search result card shape
- Parcel detail normalization
- bbox/centroid helpers
- click-to-select behavior

### Design console / SVG helpers
Source candidates:

- `apps/web/src/modules/design/DesignMapCanvas.tsx`
- `apps/web/src/modules/design/DesignLeftPanel.tsx`
- `apps/web/src/modules/design/DesignRightPanel.tsx`

Use only helper concepts:

- transform GeoJSON to canvas/local coordinates
- preview proposed structures and labels
- layer visibility model

For the new MVP, prefer real MapLibre GeoJSON layers first, and reserve SVG only for the print/export preview.

### Packages
Potential packages to keep:

- `packages/core-geometry`
- `packages/core-siteplanner`
- `packages/map-core`

Avoid importing the whole monorepo unless you want another monorepo. For a simpler MVP, copy only the specific helpers you need into `src/lib` first. You can re-package later.

## Leave behind for this MVP

Do not bring these into the new repo initially:

- Title commitment/document workflows
- Supabase admin/membership stack
- Full project workflow page
- Subdivision/yield modules
- Advanced survey modules
- RackNerd deployment scripts
- Old migrations that do not support the simple MVP

## Recommendation

Create a new single-app Vite repository first. Avoid Turborepo/pnpm workspace until the MVP earns complexity. Keep the app deployable as a single static frontend plus a small API/proxy layer.

Preferred initial architecture:

- `src/components` - simple UI and layout
- `src/map` - MapLibre canvas, layer descriptors, basemap registry
- `src/services` - parcel/geocode/terrain/export services
- `src/state` - Zustand stores for parcel, drawing, and project state
- `src/types` - shared simple domain types
- `src/export` - later PDF output pipeline
