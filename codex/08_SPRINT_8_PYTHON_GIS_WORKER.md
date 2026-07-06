# Codex Patch 08 - Python GIS Worker

## Intent

Add a dedicated GIS processing service for geometry validation and spatial analysis while keeping the React app lightweight.

## Existing anchors

- `server/`
- `scripts/`
- `codex/07_SPRINT_7_POSTGIS_GEODATABASE.md`

## Required changes

1. Create `services/gis-worker/`.
2. Add a FastAPI app entrypoint.
3. Add `services/gis-worker/requirements.txt` with:
   - `fastapi`
   - `uvicorn`
   - `geopandas`
   - `shapely`
   - `pyproj`
   - `fiona`
   - `rasterio`
4. Implement endpoints:
   - `POST /validate-geometry`
   - `POST /buffer`
   - `POST /intersect`
   - `POST /clip`
   - `POST /area`
   - `POST /reproject`
5. Add `server/gisWorkerClient.mjs`.
6. Add `docs/python-gis-worker.md`.

## Operational requirements

- Keep the worker contract GeoJSON-first.
- Return validity, area, bounds, and repair suggestions in a stable JSON shape.
- Do not move analysis logic into the browser once the worker exists.

## Acceptance checks

- Node can send GeoJSON payloads to the worker and receive structured responses.
- Geometry validation reports invalid features and repair guidance.
- Reproject and area endpoints work on representative polygon input.
