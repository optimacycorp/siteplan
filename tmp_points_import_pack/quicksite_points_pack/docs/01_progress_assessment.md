# Current WIP Assessment

## Overall status

The MVP is now beyond scaffold and has the right core shape for a simplified site-plan tool:

- React / Vite / TypeScript application shell
- MapLibre map canvas
- address / parcel search flow
- provider registry with Fulton County, Maricopa, Pueblo, fixture, and open parcel proxy paths
- parcel selection and neighbors
- drawing wizard for structure, driveway, and dimension
- advanced easement and label tools
- persistent drawing store using Zustand
- measurement labels for line distances, polygon edge distances, and polygon area
- 3DEP terrain proxy / contour service hooks
- print/export route with stored export session

That is good progress. The code is maturing into a usable MVP instead of just a demo.

## Main risk

The main risk is that the portal can drift back toward a complex GIS/survey platform. The current UI is still reasonably simple, but each new technical feature should enter through a controlled workflow:

1. Find parcel.
2. Confirm parcel.
3. Add/import plan features.
4. Review labels/measurements.
5. Export.

Point import should support that flow, not become a full survey-processing module yet.

## Best next feature

Point import is a strong next feature because it makes the MVP feel immediately useful in the field. It can let you take GPS / total-station points and quickly place:

- measured corners
- proposed structure corners
- driveway points
- utility points
- control points
- photo / note locations
- topo shots later

## Recommended implementation level

Start with **local coordinate import** only:

- CSV import
- point number / name / northing / easting / optional elevation / optional code / optional note
- user chooses units: feet or meters
- user defines one local origin by clicking the map or using selected parcel centroid
- user defines rotation angle, default 0 degrees
- app transforms local XY into WGS84 lon/lat for display
- imported points display as a new map layer and feature list
- imported points persist locally and export with the plan

Do not start with raw Trimble JOB/T02/JXL, Survey Pro files, RINEX, or full least-squares adjustment. Those are valuable later, but too heavy for this MVP phase.
