# PATCH-06 — Test Plan

## Unit tests

- `normalizeParcelFeature` maps county-specific fields correctly.
- `lookup_parcel_by_point` returns contains match when point is inside polygon.
- `lookup_parcel_by_point` returns near match when point is close but outside.
- API returns `not_found` instead of throwing when providers fail.

## Manual Colorado tests

Use known addresses:
- 3245 Rampart Range Road, Colorado Springs, CO
- 2901 Rampart Range Road, Colorado Springs, CO
- A known downtown Colorado Springs parcel
- A known Fountain CMU parcel

Expected:
- If parcel exists in local cache, exact polygon returns.
- If not loaded, map centers from geocode.
- UI does not spam provider requests.
- Repeated miss is cached.
- Regrid is not required.

## Manual non-Colorado tests

- Dallas, TX broad city query should not be treated as a parcel lookup.
- Full address should geocode first, then parcel lookup by point.
