# Acceptance Tests

## Test 1 — Parcel auto-fit on selection
Given:
- a parcel is selected
When:
- the parcel page or designer loads
Then:
- the map fits to the parcel bounds automatically

## Test 2 — Parcel auto-fit on reload
Given:
- a project already has an active parcel anchor
When:
- the page reloads
Then:
- the parcel anchor is restored and the map auto-fits again

## Test 3 — Adjoining parcels render in designer
Given:
- a parcel with valid geometry and bbox
When:
- the designer loads
Then:
- neighboring parcels are fetched and displayed around the selected parcel

## Test 4 — Selected parcel remains visually dominant
Given:
- selected parcel and adjoining parcels are both rendered
Then:
- the selected parcel is highlighted more strongly than adjacent parcels
