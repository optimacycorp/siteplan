# Current MVP Evaluation

## Overall status

The MVP is on the right track. The repo has successfully separated the QuickSite concept from the heavier Land Portal codebase and now has the correct lightweight shape:

- Vite + React + TypeScript single-page app.
- MapLibre map canvas.
- Address search component.
- Parcel summary panel.
- Drawing toolbar.
- Layer toggles.
- Local drawing persistence.
- Provider-neutral parcel proxy direction.
- Supabase/PostGIS migration and loader scaffolding for an open parcel path.
- Deployment notes and systemd/nginx assets.

The main win is that this already feels like a separate product instead of a reduced Land Portal screen.

## MVP grade

Current grade: **B- / early beta foundation**

It is no longer just a scaffold. It has real architecture and working product pieces. It is not yet a polished MVP because the core user flow still has friction, the print/export path is too thin, and the open parcel data pipeline is more advanced than the visible product experience.

## What is working well

### 1. Separation from the advanced portal is successful

The current code avoids the title-commitment, survey-review, subdivision, and AI workflows. This is exactly right. QuickSite needs to stay focused on address-to-exhibit.

### 2. The component model is clean

The main app shell is easy to understand:

- Left: find property, draw exhibit, layers.
- Center: map.
- Right: parcel summary and drawing feature properties.

That is the right basic mental model for a simplified site-plan MVP.

### 3. Drawing state is intentionally separate

`quickSiteStore` handles parcel/search/map/layer state. `drawingStore` handles sketch tools and drawn features. That separation should stay.

### 4. The open parcel migration is promising

The repo now includes provider-neutral proxy work, Supabase/PostGIS functions, and El Paso County loader scaffolding. This is the correct long-term move away from Regrid dependence.

### 5. Local persistence is already present for drawings

Persisting drawings in `localStorage` is a good MVP choice. User accounts and cloud projects can wait.

## Main risks and gaps

### 1. Build reproducibility needs to be locked down first

The uploaded package uses `pnpm` scripts, but the evaluation environment did not have `pnpm` available, and an attempted `npm install` did not complete within the available execution window. The repo should be hardened so a fresh environment has one obvious setup path.

Recommended fix:

- Commit a lockfile for the chosen package manager.
- Add `corepack enable` instructions.
- Add a `scripts/check-env.mjs` script.
- Add a lightweight smoke test that does not require live parcel API credentials.

### 2. Map style switching may lose custom layers

`QuickMapCanvas` calls `map.setStyle(...)` when the basemap changes, then re-registers app layers on `styledata`. In MapLibre/Mapbox-style APIs, layers and sources added after initial style load generally need to be re-added after style changes. The current direction is right, but `style.load` is usually a safer event than a single `styledata` callback, and layer ordering should be explicit.

Recommended fix:

- Re-register custom sources/layers on `style.load` after `setStyle`.
- Add a stable layer order registry.
- Add a defensive cleanup/re-add path for missing layers.

### 3. The visible user flow still feels too technical

The UI labels are functional but not yet guided. A nontechnical user needs a clearer path:

1. Find property.
2. Confirm parcel.
3. Draw proposed items.
4. Add labels/dimensions.
5. Export exhibit.

The existing layout has these pieces, but it needs stronger status messaging and fewer exposed implementation details.

### 4. Print/export is only `window.print()`

That is fine as a temporary placeholder, but the MVP promise depends on export quality. The app needs a real print-preview mode, title block fields, north arrow, scale note, disclaimer, and print CSS.

### 5. Drawing tools need measurement outputs

The drawing tools exist, but they need to become useful:

- Polygon area.
- Line length.
- Dimension label value.
- Rename/delete clarity.
- Escape/cancel behavior.
- Undo last feature.

### 6. Parcel provider complexity is growing faster than product polish

The open parcel backend work is good, but the MVP can get bogged down if the next sprint focuses only on loaders and provider abstractions. The next sprint should stabilize the product experience first, then return to parcel imports.

## Recommended next decision

Do **not** add accounts, dashboards, AI, title upload, subdivision analysis, or multi-project management yet.

The next milestone should be:

> A beta user can enter an address, select or click a parcel, draw a proposed structure/driveway/dimension/label, and print a clean PDF-style exhibit in under five minutes.

## Suggested priority order

1. Build and map stability.
2. Guided workflow and UI simplification.
3. Drawing measurements and editing polish.
4. Print-preview/export.
5. Open parcel data pipeline hardening.
6. QA/beta release.
