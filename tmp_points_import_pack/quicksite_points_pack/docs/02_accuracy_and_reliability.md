# Accuracy and Reliability Assessment

## Is point import possible?

Yes. It is very possible, and it fits the MVP well.

## Can it be accurate?

It depends what kind of accuracy you mean.

### Relative accuracy

If the imported points come from a total station or RTK rover in one consistent local coordinate system, relative geometry can be very good. Distances and shapes between imported points can preserve field-measured relationships well.

### Absolute map accuracy

Absolute placement on the web map is only as good as the transformation between the field coordinate system and the map coordinate system. Aerial imagery, parcel GIS, building footprints, and county parcel data are not survey control. They can be shifted.

For the MVP, the correct disclaimer is:

> Imported points are displayed for planning and exhibit preparation. They are not a survey-grade coordinate transformation unless tied to verified control by a qualified surveyor.

## Local coordinate import is the right first step

A local coordinate importer can be reliable if it is explicit about assumptions:

- local northing/easting are in a consistent system
- user selects feet or meters
- user chooses an origin point on the map
- user enters rotation from local north to map/geodetic north
- app shows a transformation summary
- app warns that web-map imagery and parcel GIS are not control

## What accuracy features should be introduced later?

Add these in stages:

1. **Local transform v1** — one origin + rotation + scale/unit.
2. **Two-point calibration** — fit translation, rotation, and scale from two known control pairs.
3. **Multi-point calibration** — residual report from 3+ control pairs.
4. **State Plane import** — EPSG/proj4-backed import for known CRS files.
5. **GNSS metadata** — horizontal/vertical precision, datum, epoch, receiver, source file.
6. **Survey export** — CSV/DXF/GeoJSON/SHP export.

## State Plane note

You will eventually want CRS support. But introducing it too early can create false precision. State Plane coordinates depend on zone, datum, unit, and sometimes epoch. SPCS2022 adds more zone layers and low-distortion options, so the UI must be deliberate rather than just asking for “State Plane.”
