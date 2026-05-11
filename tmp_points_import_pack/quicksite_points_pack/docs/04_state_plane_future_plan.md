# State Plane / CRS Future Plan

## Why not full State Plane first?

State Plane support is important, but it should not be the first implementation because users can easily select the wrong zone, datum, or unit and get points that look precise but are wrong.

## Required CRS concepts

Before accepting State Plane coordinates, the app needs a CRS panel with:

- coordinate reference system name
- EPSG code or proj string
- datum / realization where known
- units: meters, international feet, or legacy U.S. survey feet
- vertical datum for elevations, if used
- import file metadata
- transform summary and warnings

## Suggested phases

### Phase A — CRS metadata only

Add a `CoordinateSystemPanel` that records metadata but does not transform State Plane yet.

### Phase B — proj4js transform

Add `proj4` and a curated CRS registry:

- Colorado Central / South / North as needed
- Georgia West / East, depending on Fulton County use case
- WGS84 / EPSG:4326
- Web Mercator only as display output, never as survey input

### Phase C — two-point calibration

For field usability, two-point calibration may be more useful than raw CRS import. The user can identify point A/B in local coordinates and tie them to map/control coordinates.

### Phase D — residual report

Use 3+ control pairs to show residuals. This becomes the foundation for serious QA.

## Standards note

The old U.S. survey foot has been deprecated federally, and SPCS2022 introduces additional statewide and low-distortion zone concepts. Treat units and datum as explicit fields, not assumptions.
