# Regrid Replacement / Open Parcel API — Codex Patch Specs

Purpose: replace the hard dependency on Regrid with a provider-neutral parcel API that prefers your own parcel cache in Supabase/PostGIS, uses open geocoding, and keeps Regrid only as an optional fallback during transition.

Target app: Siteplan / Optimacy QuickSite React + Node proxy stack.

Main idea:
1. Geocode an address to coordinates.
2. Query local PostGIS parcel polygons by point containment.
3. If no local parcel exists, query a configured county/state ArcGIS service and optionally cache the result.
4. If still no result, center the map and allow manual parcel selection.
5. Keep Regrid behind a provider flag only during migration.

Recommended first Colorado data source:
- El Paso County parcels via public GIS service.
- Colorado Public Parcels as a statewide fallback/reference layer.
