# ArcGIS Online Integration

SitePlan Sprint 6 adds a lightweight ArcGIS REST connector for public hosted layers.

## Current scope

- Paste a public `FeatureServer/{layerId}` or `MapServer/{layerId}` URL.
- Preview layer metadata before import.
- Query the layer as GeoJSON in the browser.
- Store the imported result as a normal GIS layer with source URL attribution.

## Required environment

Client-side defaults:

```env
VITE_ARCGIS_PORTAL_URL=https://www.arcgis.com
VITE_ARCGIS_CLIENT_ID=
```

The current implementation does not require an OAuth login for public layers. `VITE_ARCGIS_CLIENT_ID` is reserved for later authenticated ArcGIS Online work.

## Expected URLs

Supported examples:

- `https://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/3`
- `https://services.arcgis.com/.../ArcGIS/rest/services/LayerName/FeatureServer/0`

Unsupported in this sprint:

- service root URLs without a layer id
- private ArcGIS Online layers that require OAuth
- services that do not allow browser-side GeoJSON queries

## Failure modes

- `ArcGIS request failed (...)`: service offline or browser request blocked
- `ArcGIS layer query failed (...)`: the service may not support GeoJSON output
- `Use a specific ArcGIS layer URL ...`: the pasted URL points at a service root instead of a layer

## Reviewer notes

- Imported ArcGIS layers are saved in the GIS layer store with `sourceType: arcgis`.
- Exported project GeoJSON preserves the ArcGIS source URL in feature metadata.
