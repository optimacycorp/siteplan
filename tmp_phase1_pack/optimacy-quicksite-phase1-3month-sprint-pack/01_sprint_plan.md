# 12-Week Sprint Plan

## Sprint 1 — Provider Foundation + Fulton County
Create provider registry, preserve Colorado/Regrid behavior, add Fulton County ArcGIS provider, normalize ParcelFeature, make address search primary and parcel-ID secondary.

## Sprint 2 — 3DEP Contours
Use USGS/The National Map contour service as optional visual overlay. Add opacity, persistence, graceful failure, and export disclaimer.

## Sprint 3 — Building Footprints
Add building provider abstraction. Start with Overture/OSM/county/fixture provider. Clip/highlight buildings intersecting selected parcel.

## Sprint 4 — Persistent Labels
Create label model and persistence. Auto-label acreage, distance, and bearing. Add manual note labels. Include labels in export.

## Sprint 5 — Entry Tool / Misclosure Wedge
Add deed-call table, bearing parser, traverse engine, misclosure calculation, closing vector, and wedge visualization.

## Sprint 6 — Deed Text to Sketch Plat
Add conservative parser for simple metes-and-bounds line calls. Flag unsupported calls. Generate editable calls table and sketch export.

## Sprint 7 — Setback / Zoning Constraint Layer
Add JSON ruleset schema, manual zone selector, offset/setback rendering, frontage assumption display, and export notes.

## Sprint 8 — Beta Hardening
Compress UI into Find → Confirm → Draw/Enter → Export. Hide advanced tools by default. Add QA fixtures for Colorado and Fulton.
