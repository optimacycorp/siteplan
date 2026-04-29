# Sprint 1 — Parcel Foundation and Map-First Transition

## Goal
Make parcel selection the active system anchor and make the map/designer respond to it.

## Why this comes next
MapLibre supports fitting a map to geographic bounds and rendering GeoJSON sources/layers, which makes it a strong fit for selected-parcel and neighboring-parcel visualization. Regrid’s Parcel API returns GeoJSON Feature Collections for parcel records, which fits the same pipeline well.

## Patch tasks
1. Patch parcel selection state so the active parcel anchor exposes:
   - geometry
   - bbox
   - centroid if available
   - address
   - provider parcel id
2. Patch project reload flow so the active parcel anchor is restored.
3. Patch shared map canvas to call `fitBounds` when the active parcel bbox is available.
4. Patch the designer to use the shared map foundation.
5. Patch the designer to render the selected parcel as the primary highlighted feature.
6. Patch the parcel provider wrapper to fetch adjoining parcels by expanded bbox.
7. Patch the designer to render adjoining parcels with lighter styling.
8. Patch shared layer helpers for selected parcel vs adjoining parcel styling.
9. Add/keep labels off for adjoining parcels by default.

## Acceptance
- selecting a parcel auto-fits the map/designer to the parcel
- reloading restores the active parcel and fits again
- designer shows selected parcel and adjoining parcels
- selected parcel remains visually dominant
