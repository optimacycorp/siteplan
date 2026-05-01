# Next Sprint Plan

## Sprint 1 - Build foundation and map stability

Goal: make the repo easy to run and stabilize MapLibre layer behavior.

Deliverables:

- Package-manager setup documented and enforced.
- `.env.example` expanded.
- Smoke test page/data fixture.
- Map layer re-registration hardened after basemap changes.
- Basic runtime diagnostics panel for parcel proxy availability.

Acceptance:

- Fresh clone can run with one documented command path.
- `pnpm build` and `pnpm test` pass.
- Map layers survive switching Streets/Light/Topo/Aerial.
- App can load a fixture parcel without live API credentials.

## Sprint 2 - User flow simplification

Goal: make the product feel like a simple guided site-plan creator.

Deliverables:

- Step header with status: Find, Confirm, Draw, Export.
- Selected parcel confirmation card.
- Clear primary CTA at each step.
- Better empty/error/loading states.
- Hide advanced parcel/provider details behind “More details.”

Acceptance:

- New user understands the next action without explanation.
- Search and click-to-select flows produce clear outcomes.
- Parcel summary is readable and not overloaded.

## Sprint 3 - Measurements and drawing polish

Goal: make drawing features useful enough for planning exhibits.

Deliverables:

- Length and area helpers.
- Feature list shows length/area summary.
- Dimension lines display calculated length labels on map.
- Escape cancels active sketch.
- Undo last feature.
- Clear draft button.
- Optional snap/orthogonal mode deferred but planned.

Acceptance:

- Structure polygon displays approximate square footage and acres.
- Driveway/easement/dimension lines display approximate feet.
- User can recover from mistakes without refreshing.

## Sprint 4 - Print preview and PDF export

Goal: produce a clean exhibit users can save as PDF.

Deliverables:

- Print preview mode.
- Title block fields.
- Letter and 11x17 landscape print CSS.
- North arrow, scale note, disclaimer.
- Export button launches print from preview.

Acceptance:

- Output includes parcel, drawings, labels, title block, disclaimer.
- Print preview is usable without the side panels.
- Exported PDF looks like a planning exhibit, not a screenshot of the app.

## Sprint 5 - Open parcel data pipeline

Goal: make the Colorado parcel path reliable without relying on Regrid by default.

Deliverables:

- Loader dry-run diagnostics.
- Import status endpoint.
- Search diagnostics UI/dev page.
- Better candidate ranking by APN/address/point containment.
- Documented El Paso County load workflow.

Acceptance:

- Rampart/Cedar Heights target areas can be preloaded repeatably.
- Search and click selection work from local/Supabase data.
- Regrid fallback remains optional and off by default.

## Sprint 6 - QA beta release

Goal: prepare for external feedback.

Deliverables:

- Manual QA checklist.
- Seed fixture project.
- Error reporting breadcrumbs in console/dev panel.
- Deployment verification checklist.
- Beta README.

Acceptance:

- A tester can complete the full flow in under five minutes.
- Known limitations are visible and honest.
- Advanced Land Portal concepts do not appear in QuickSite.
