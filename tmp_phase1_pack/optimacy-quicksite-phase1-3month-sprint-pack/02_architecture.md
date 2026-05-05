# Architecture

Use provider adapters so counties/data sources can be swapped without rewriting the UI.

Recommended folders:

```txt
src/data/providers/
  parcels/
    types.ts
    providerRegistry.ts
    fultonCountyProvider.ts
    regridProvider.ts
  buildings/
    types.ts
    overtureProvider.ts
  terrain/
    usgs3dep.ts

src/domain/
  traverse/
    bearingParser.ts
    traverseEngine.ts
    misclosure.ts
  constraints/
    rulesSchema.ts
    setbackEngine.ts
  labels/
    labelModel.ts
    measurementLabels.ts
```

Core normalized types:

```ts
export type ParcelFeature = {
  id: string;
  source: string;
  jurisdiction?: string;
  address?: string;
  parcelId?: string;
  ownerName?: string;
  acreage?: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  raw?: unknown;
};

export type DrawingLabel = {
  id: string;
  kind: 'bearing' | 'distance' | 'area' | 'note' | 'setback' | 'call';
  text: string;
  anchor: GeoJSON.Point;
  sourceEntityId?: string;
  locked?: boolean;
  updatedAt: string;
};
```
