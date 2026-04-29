# File-by-File Patch Tasks

## File 1
`apps/web/src/modules/parcel/useProjectParcelSelection.ts`
Or equivalent parcel selection hook/service.

### Task A — Ensure active parcel anchor exposes geometry + bbox
Patch the returned parcel selection model so it includes:
- geometry
- bbox
- centroid if available

### Task B — Persist active anchor cleanly
If parcel anchor persistence is incomplete, patch it so one active parcel anchor is restored on reload.

### Acceptance
- selected parcel anchor is available to both parcel page and designer

---

## File 2
`apps/web/src/modules/map/MapCanvas.tsx`
Or equivalent shared map canvas.

### Task A — Add fit-to-parcel behavior
When a selected parcel with bbox is available, call `map.fitBounds(...)`.

### Requirements
- run on initial load when parcel exists
- run on parcel change
- use padding
- do not endlessly re-fit on every render

### Acceptance
- map auto-fits to the selected parcel reliably

---

## File 3
`apps/web/src/modules/design/...`
Patch the subdivision designer entry component or map wrapper used there.

### Task A — Use real map base in designer
Ensure the designer uses the shared map foundation rather than an isolated blank workspace where possible.

### Task B — Render selected parcel
Use the selected parcel geometry as a highlighted layer.

### Task C — Render adjoining parcels
Fetch neighboring parcels by expanded bbox and render them with lighter styling.

### Acceptance
- designer shows selected parcel and surrounding parcels

---

## File 4
`apps/web/src/modules/parcel/...` or parcel provider service layer

### Task A — Add adjoining parcel fetch
Create or patch a function to request parcel neighbors by bbox.

### Requirements
- use existing parcel provider wrapper if present
- return GeoJSON features
- keep this separate from selected parcel detail fetch

### Acceptance
- designer receives neighboring parcel features for rendering

---

## File 5
Shared map layer model or map utility file

### Task A — Add reusable parcel layer builders
Patch or add helper functions for:
- selected parcel layer style
- adjoining parcels layer style

### Acceptance
- selected and adjoining parcels are styled consistently across views
