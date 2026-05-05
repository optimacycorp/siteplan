# Fulton County Expansion

Fulton County is feasible because Fulton/Atlanta-area parcel data is available through ArcGIS/Open Data style services.

MVP approach:
1. Geocode address.
2. If address is in Fulton County, query Fulton parcel layer by point geometry.
3. Normalize geometry/attributes to ParcelFeature.
4. Support parcel-ID search after field names are confirmed from layer metadata.
5. Label source as Fulton County GIS/open data.

Cautions:
- ArcGIS field names vary.
- Geometry may come in Web Mercator; normalize to WGS84 GeoJSON.
- County parcel data is for GIS/planning reference, not survey control.
- Atlanta zoning is not the same as Fulton parcel lookup.
