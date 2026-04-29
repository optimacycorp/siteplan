# Codex Prompt Templates

## Prompt 1 — Auto-fit selected parcel

Update the shared map canvas and parcel selection integration so the map auto-fits to the selected parcel.

Files:
- `apps/web/src/modules/parcel/useProjectParcelSelection.ts` or equivalent
- `apps/web/src/modules/map/MapCanvas.tsx` or equivalent

Requirements:
- selected parcel anchor must expose geometry and bbox
- map should call `fitBounds` when bbox is available
- run on initial load and parcel change
- do not endlessly re-fit on every render

Acceptance criteria:
- selected parcel is centered and zoomed automatically
- reload restores the active parcel and fits again

---

## Prompt 2 — Adjoining parcels in designer

Update the subdivision designer so it shows adjoining parcels.

Files:
- designer entry/map component
- parcel provider service/wrapper
- shared map layer utilities if needed

Requirements:
- fetch neighboring parcels by expanded bbox around selected parcel
- render selected parcel strongly
- render adjoining parcels lightly
- keep labels on adjoining parcels off by default
- make the minimum necessary change

Acceptance criteria:
- designer shows selected parcel plus neighboring parcels
- selected parcel remains visually dominant

---

## Prompt 3 — Shared parcel layer helpers

Update shared map utilities to support reusable parcel layers.

Files:
- map utility/layer builder files

Requirements:
- add helper for selected parcel style
- add helper for adjoining parcel style
- keep layer definitions reusable across parcel page and designer

Acceptance criteria:
- selected/adjoining parcel styling is consistent
