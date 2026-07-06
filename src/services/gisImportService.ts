import type { DrawingFeature } from "../types/drawing";
import type { GisLayer, GisLayerSourceType } from "../types/gisLayer";

type ImportSuccess = {
  ok: true;
  layer: GisLayer;
};

type ImportFailure = {
  ok: false;
  error: string;
};

export type GisImportResult = ImportSuccess | ImportFailure;

const unsupportedFormatMessages: Record<string, string> = {
  shp: "Shapefile import will require server-side processing in a later sprint.",
  zip: "Shapefile ZIP import will require server-side processing in a later sprint.",
  kml: "KML import will require server-side processing in a later sprint.",
  dxf: "DXF import will require server-side processing in a later sprint.",
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function inferExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function sanitizeLayerName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "Imported GIS layer";
}

function featureCollectionFromUnknown(input: unknown): GeoJSON.FeatureCollection | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as { type?: string; features?: unknown[]; geometry?: unknown; properties?: unknown };

  if (candidate.type === "FeatureCollection" && Array.isArray(candidate.features)) {
    return {
      type: "FeatureCollection",
      features: candidate.features as GeoJSON.Feature[],
    };
  }

  if (candidate.type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [candidate as GeoJSON.Feature],
    };
  }

  if (typeof candidate.type === "string") {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: candidate as GeoJSON.Geometry,
        },
      ],
    };
  }

  return null;
}

function normalizeFeatureProperties(
  properties: Record<string, unknown> | null | undefined,
  layerName: string,
  featureIndex: number,
) {
  const safeProperties = properties && typeof properties === "object" ? properties : {};
  const labelCandidates = [
    safeProperties.name,
    safeProperties.title,
    safeProperties.label,
    safeProperties.id,
    safeProperties.apn,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const label = labelCandidates[0] ?? `${layerName} ${featureIndex + 1}`;

  return {
    ...safeProperties,
    label,
    layerName,
  };
}

function normalizeFeatureCollection(featureCollection: GeoJSON.FeatureCollection, layerName: string) {
  const warnings: string[] = [];

  const features = featureCollection.features
    .filter((feature): feature is GeoJSON.Feature => Boolean(feature?.geometry))
    .map((feature, featureIndex) => ({
      type: "Feature",
      properties: normalizeFeatureProperties(feature.properties as Record<string, unknown>, layerName, featureIndex),
      geometry: feature.geometry,
    })) as GeoJSON.Feature[];

  if (!features.length) {
    warnings.push("No renderable features were found in this file.");
  }

  const geometryTypes = [...new Set(features.map((feature) => feature.geometry?.type).filter(Boolean))] as string[];

  return {
    warnings,
    featureCollection: {
      type: "FeatureCollection",
      features,
    } as GeoJSON.FeatureCollection,
    geometryTypes,
  };
}

function readCrsName(input: unknown) {
  if (!input || typeof input !== "object") return undefined;
  const crs = (input as { crs?: { properties?: { name?: unknown } } }).crs;
  const crsName = crs?.properties?.name;
  return typeof crsName === "string" && crsName.trim() ? crsName : undefined;
}

function buildLayer(options: {
  name: string;
  sourceName: string;
  sourceType: GisLayerSourceType;
  data: GeoJSON.FeatureCollection;
  geometryTypes: string[];
  warnings?: string[];
  crsName?: string;
  sourceUrl?: string;
}) {
  return {
    id: crypto.randomUUID(),
    name: options.name,
    sourceName: options.sourceName,
    sourceType: options.sourceType,
    data: options.data,
    geometryTypes: options.geometryTypes,
    featureCount: options.data.features.length,
    visible: true,
    warnings: options.warnings ?? [],
    crsName: options.crsName,
    sourceUrl: options.sourceUrl,
    importedAt: new Date().toISOString(),
  } satisfies GisLayer;
}

export async function importGisFile(file: File): Promise<GisImportResult> {
  const extension = inferExtension(file.name);
  const unsupportedMessage = unsupportedFormatMessages[extension];

  if (unsupportedMessage) {
    return {
      ok: false,
      error: unsupportedMessage,
    };
  }

  const text = await file.text();

  if (extension === "csv") {
    return importCsvLayer(text, file.name);
  }

  if (extension === "geojson" || extension === "json") {
    return importGeoJsonLayer(text, file.name);
  }

  return {
    ok: false,
    error: "Unsupported GIS file type. Use GeoJSON or CSV point files for this sprint.",
  };
}

export function importGeoJsonLayer(text: string, sourceName = "import.geojson"): GisImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "GeoJSON could not be parsed. Check for invalid JSON syntax.",
    };
  }

  const featureCollection = featureCollectionFromUnknown(parsed);
  if (!featureCollection) {
    return {
      ok: false,
      error: "This file is not valid GeoJSON. Expected a FeatureCollection, Feature, or Geometry.",
    };
  }

  const layerName = sanitizeLayerName(sourceName);
  const normalized = normalizeFeatureCollection(featureCollection, layerName);
  if (!normalized.featureCollection.features.length) {
    return {
      ok: false,
      error: "The GeoJSON file did not contain any renderable features.",
    };
  }

  return {
    ok: true,
    layer: buildLayer({
      name: layerName,
      sourceName,
      sourceType: "geojson",
      data: normalized.featureCollection,
      geometryTypes: normalized.geometryTypes,
      warnings: [
        ...normalized.warnings,
        ...(readCrsName(parsed) && !/4326|crs84|wgs ?84/i.test(readCrsName(parsed) || "")
          ? [`Source CRS reported as ${readCrsName(parsed)}. Reproject to WGS84 if the layer draws in the wrong location.`]
          : []),
      ],
      crsName: readCrsName(parsed),
    }),
  };
}

export function importCsvLayer(text: string, sourceName = "points.csv"): GisImportResult {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      ok: false,
      error: "CSV needs a header row and at least one data row.",
    };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const longitudeIndex = headers.findIndex((header) =>
    ["longitude", "lon", "lng", "x", "long"].includes(header),
  );
  const latitudeIndex = headers.findIndex((header) =>
    ["latitude", "lat", "y"].includes(header),
  );
  const labelIndex = headers.findIndex((header) =>
    ["name", "label", "title", "id", "point", "point_number"].includes(header),
  );

  if (longitudeIndex === -1 || latitudeIndex === -1) {
    return {
      ok: false,
      error: "CSV import requires longitude and latitude columns for this sprint.",
    };
  }

  const features: GeoJSON.Feature[] = [];
  const warnings: string[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const cells = parseCsvLine(line);
    const lng = Number(cells[longitudeIndex]);
    const lat = Number(cells[latitudeIndex]);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      warnings.push(`Row ${rowIndex + 2} was skipped because longitude/latitude were not numeric.`);
      return;
    }

    const properties = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = cells[headerIndex] ?? "";
      return acc;
    }, {});

    const label =
      (labelIndex >= 0 ? cells[labelIndex] : "") ||
      `Point ${features.length + 1}`;

    features.push({
      type: "Feature",
      properties: {
        ...properties,
        label,
        layerName: sanitizeLayerName(sourceName),
      },
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });
  });

  if (!features.length) {
    return {
      ok: false,
      error: warnings[0] || "No valid CSV points were found.",
    };
  }

  return {
    ok: true,
    layer: buildLayer({
      name: sanitizeLayerName(sourceName),
      sourceName,
      sourceType: "csv",
      data: {
        type: "FeatureCollection",
        features,
      },
      geometryTypes: ["Point"],
      warnings: [
        "CSV points are assumed to already be in WGS84 longitude/latitude.",
        ...warnings,
      ],
      crsName: "EPSG:4326 assumed",
    }),
  };
}

function drawingToFeature(drawing: DrawingFeature): GeoJSON.Feature | null {
  if (drawing.type === "label-point") {
    const point = drawing.points[0];
    if (!point) return null;
    return {
      type: "Feature",
      properties: {
        id: drawing.id,
        label: drawing.label,
        sourceType: "drawing",
        drawingType: drawing.type,
      },
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    };
  }

  if (drawing.type === "structure-polygon") {
    if (drawing.points.length < 3) return null;
    const ring = drawing.points.map((point) => [point.lng, point.lat]);
    const [firstLng, firstLat] = ring[0];
    return {
      type: "Feature",
      properties: {
        id: drawing.id,
        label: drawing.label,
        sourceType: "drawing",
        drawingType: drawing.type,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[...ring, [firstLng, firstLat]]],
      },
    };
  }

  if (drawing.points.length < 2) return null;
  return {
    type: "Feature",
    properties: {
      id: drawing.id,
      label: drawing.label,
      sourceType: "drawing",
      drawingType: drawing.type,
    },
    geometry: {
      type: "LineString",
      coordinates: drawing.points.map((point) => [point.lng, point.lat]),
    },
  };
}

export function buildProjectGeoJson(input: {
  drawings: DrawingFeature[];
  gisLayers: GisLayer[];
}) {
  const drawingFeatures = input.drawings
    .map(drawingToFeature)
    .filter((feature): feature is GeoJSON.Feature => Boolean(feature));

  const gisFeatures = input.gisLayers.flatMap((layer) =>
    layer.data.features.map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        sourceType: layer.sourceType,
        layerId: layer.id,
        layerName: layer.name,
      },
    })),
  );

  return {
    type: "FeatureCollection",
    features: [...drawingFeatures, ...gisFeatures],
  } satisfies GeoJSON.FeatureCollection;
}

export function downloadGeoJson(featureCollection: GeoJSON.FeatureCollection, fileName: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
    type: "application/geo+json",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function extendBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  coordinates: unknown,
) {
  if (!Array.isArray(coordinates)) return;
  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    const lng = coordinates[0];
    const lat = coordinates[1];
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    return;
  }

  coordinates.forEach((entry) => extendBounds(bounds, entry));
}

function extendGeometryBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  geometry: GeoJSON.Geometry | null | undefined,
) {
  if (!geometry) return;

  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((entry) => extendGeometryBounds(bounds, entry));
    return;
  }

  extendBounds(bounds, geometry.coordinates);
}

export function featureCollectionBounds(
  featureCollection: GeoJSON.FeatureCollection,
): [[number, number], [number, number]] | null {
  if (!featureCollection.features.length) return null;
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };

  featureCollection.features.forEach((feature) => {
    extendGeometryBounds(bounds, feature.geometry);
  });

  if (![bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].every(Number.isFinite)) {
    return null;
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}
