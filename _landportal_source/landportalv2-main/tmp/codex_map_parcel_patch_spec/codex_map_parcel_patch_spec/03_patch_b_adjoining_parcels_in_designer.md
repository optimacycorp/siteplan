# Patch B — Adjoining Parcels in the Subdivision Designer

## Goal
The subdivision designer should show the selected parcel plus adjoining parcels so the user has real surrounding context.

## Required behavior
- selected parcel is highlighted strongly
- nearby/adjoining parcels are fetched and rendered with lighter styling
- adjoining parcels should not overpower the selected parcel
- the designer should remain interactive and performant

## Data strategy
Use parcel provider APIs/tiles to fetch neighboring parcels by expanded bbox around the selected parcel. Regrid’s current Parcel API returns GeoJSON Feature Collections, and Regrid also offers tile-based parcel layers for map display. citeturn994638search2turn994638search1turn994638search8

## Expansion rule
Create an expanded bbox around the selected parcel before requesting neighbors.
Suggested initial rule:
- expand by a factor of 2x–3x of parcel bbox dimensions
- clamp to a sane max area if needed

## Rendering rules
- selected parcel: bold outline + light fill
- adjoining parcels: thin outline, little or no fill
- labels for adjoining parcels off by default
- selected parcel always rendered above neighbors

## Acceptance criteria
- the designer shows real adjacent parcel context
- the selected parcel remains visually dominant
- the designer can pan/zoom without losing context
