# PATCH-00 — Provider-Neutral Parcel Architecture

## Goal
Stop wiring UI behavior directly to Regrid. Introduce a parcel provider abstraction:

- `local-postgis`: primary
- `county-arcgis`: on-demand fallback
- `state-colorado-public-parcels`: fallback / batch seed
- `regrid`: temporary legacy fallback, disabled by default for Colorado

## Desired request flow

```txt
User enters address
  -> /api/geocode?q=...
  -> /api/parcels/lookup?lat=...&lng=...&address=...
      1. PostGIS ST_Contains(parcel.geom, point)
      2. PostGIS ST_DWithin(parcel.geom, point, tolerance) for near misses
      3. County ArcGIS query by point envelope/intersects
      4. Optional cache insert into Supabase
      5. Optional Regrid fallback only when enabled
  -> UI:
      exact parcel found: select parcel
      no parcel found but geocode found: center map + manual selection
```

## Difficulty
Moderate, not scary.

The hard part is not React. The hard part is normalizing public parcel data because each county publishes different field names, projections, refresh schedules, and geometry precision.

## Milestones
1. Provider abstraction and UI fallback messaging.
2. Supabase/PostGIS schema and lookup RPC.
3. El Paso County loader.
4. Background incremental loader.
5. Remove Regrid default path.
