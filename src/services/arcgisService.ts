import type { GisImportResult } from "./gisImportService";
import { featureCollectionBounds, importGeoJsonLayer } from "./gisImportService";
import type { GisLayer } from "../types/gisLayer";

export type ArcGisLayerMetadata = {
  name: string;
  geometryType: string;
  objectIdField: string;
  spatialReference: string;
  sourceUrl: string;
  supportsGeoJson: boolean;
  featureCountHint?: number;
};

type ArcGisLayerMetadataResponse = {
  name?: string;
  geometryType?: string;
  objectIdField?: string;
  objectIdFieldName?: string;
  uniqueIdField?: { name?: string };
  advancedQueryCapabilities?: { supportsReturningQueryExtent?: boolean };
  fields?: Array<{ name?: string; type?: string }>;
  extent?: { spatialReference?: { wkid?: number; latestWkid?: number; wkt?: string } };
  sourceSpatialReference?: { wkid?: number; latestWkid?: number; wkt?: string };
  spatialReference?: { wkid?: number; latestWkid?: number; wkt?: string };
  error?: { message?: string; details?: string[] };
};

function stripQueryAndHash(url: string) {
  return url.replace(/[?#].*$/, "");
}

export function normalizeArcGisLayerUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Paste an ArcGIS FeatureServer or MapServer layer URL.");
  }

  const normalized = stripQueryAndHash(trimmed).replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("ArcGIS layer URL must start with http:// or https://");
  }

  if (!/(FeatureServer|MapServer)\/\d+$/i.test(normalized)) {
    throw new Error(
      "Use a specific ArcGIS layer URL ending in /FeatureServer/{layerId} or /MapServer/{layerId}.",
    );
  }

  return normalized;
}

function buildRequestUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function describeSpatialReference(
  value:
    | { wkid?: number; latestWkid?: number; wkt?: string }
    | undefined,
) {
  if (!value) return "Unknown";
  if (typeof value.latestWkid === "number") return `WKID ${value.latestWkid}`;
  if (typeof value.wkid === "number") return `WKID ${value.wkid}`;
  if (typeof value.wkt === "string" && value.wkt.trim()) return "Custom WKT";
  return "Unknown";
}

async function fetchArcGisJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ArcGIS request failed (${response.status}). The service may be offline or blocking cross-origin requests.`);
  }

  const payload = (await response.json()) as T;
  const serviceError = (payload as { error?: { message?: string; details?: string[] } }).error;
  if (serviceError?.message) {
    const detail = serviceError.details?.filter(Boolean).join(" ");
    throw new Error(detail ? `${serviceError.message} ${detail}` : serviceError.message);
  }

  return payload;
}

export async function fetchArcGisLayerMetadata(sourceUrl: string): Promise<ArcGisLayerMetadata> {
  const normalizedUrl = normalizeArcGisLayerUrl(sourceUrl);
  const metadataUrl = buildRequestUrl(normalizedUrl, { f: "json" });
  const payload = await fetchArcGisJson<ArcGisLayerMetadataResponse>(metadataUrl);

  const objectIdField =
    payload.objectIdField ||
    payload.objectIdFieldName ||
    payload.uniqueIdField?.name ||
    payload.fields?.find((field) => /oid/i.test(field.type || ""))?.name ||
    "";

  return {
    name: payload.name || "ArcGIS layer",
    geometryType: payload.geometryType || "Unknown",
    objectIdField,
    spatialReference: describeSpatialReference(
      payload.spatialReference || payload.sourceSpatialReference || payload.extent?.spatialReference,
    ),
    sourceUrl: normalizedUrl,
    supportsGeoJson: true,
  };
}

function applyArcGisWarnings(layer: GisLayer, metadata: ArcGisLayerMetadata) {
  const warnings = [...layer.warnings];
  if (metadata.spatialReference !== "WKID 4326" && metadata.spatialReference !== "WKID 3857") {
    warnings.push(
      `ArcGIS layer reports ${metadata.spatialReference}. If features appear offset, publish or query the layer in WGS84.`,
    );
  }

  return {
    ...layer,
    sourceType: "arcgis" as const,
    sourceName: metadata.name,
    sourceUrl: metadata.sourceUrl,
    crsName: metadata.spatialReference,
    warnings,
  };
}

export async function importArcGisLayer(sourceUrl: string): Promise<{
  metadata: ArcGisLayerMetadata;
  importResult: GisImportResult;
}> {
  const metadata = await fetchArcGisLayerMetadata(sourceUrl);
  const queryUrl = buildRequestUrl(`${metadata.sourceUrl}/query`, {
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });

  const response = await fetch(queryUrl, {
    headers: {
      Accept: "application/geo+json, application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `ArcGIS layer query failed (${response.status}). The service may not support GeoJSON output or may be blocking this browser request.`,
    );
  }

  const geoJsonText = await response.text();
  const importResult = importGeoJsonLayer(geoJsonText, `${metadata.name}.geojson`);
  if (importResult.ok) {
    importResult.layer = applyArcGisWarnings(importResult.layer, metadata);
  }

  return { metadata, importResult };
}

export function describeArcGisLayerExtent(layer: GisLayer) {
  const bounds = featureCollectionBounds(layer.data);
  if (!bounds) return "Extent unavailable";
  return `${bounds[0][0].toFixed(5)}, ${bounds[0][1].toFixed(5)} to ${bounds[1][0].toFixed(5)}, ${bounds[1][1].toFixed(5)}`;
}
