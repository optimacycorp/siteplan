# Patch A — Parcel Anchor and Auto-Fit

## Goal
When a parcel is selected, the system should persist it as the active parcel anchor and auto-fit the map/designer view to that parcel.

## Required behavior
- selecting a parcel stores one active parcel anchor for the project
- parcel geometry is normalized into GeoJSON if needed
- parcel bbox is available
- map automatically calls `fitBounds` using the selected parcel bounds
- auto-fit runs:
  - on parcel selection
  - on initial load if an active parcel exists
  - after parcel refresh if geometry changed

MapLibre supports `fitBounds(bounds, options)` for fitting geographic bounds in the viewport. citeturn994638search9turn994638search4

## Data requirements
The active parcel anchor should expose at minimum:
- `id`
- `provider`
- `providerParcelId`
- `geometry`
- `bbox`
- `centroid`
- `address`
- `area`

## Acceptance criteria
- selecting a parcel centers and zooms the map to the parcel
- reloading the page restores the parcel anchor and fits the map again
- no manual zoom/pan is required to find the selected parcel
