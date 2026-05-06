import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../../../types/parcel";
import {
  ParcelProviderGeometryError,
  ParcelProviderUnavailableError,
  type ParcelNeighborsInput,
  type ParcelPointInput,
  type ParcelProvider,
  withDetailSource,
  withSearchResultSource,
} from "./types";

const providerId = "fulton-county-ga";
const providerLabel = "Fulton County GIS";
const defaultFultonQueryEndpoint =
  "https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Basemap/FultonStreetBaseMap/MapServer/85/query";
const queryEndpoint = String(import.meta.env.VITE_FULTON_PARCEL_QUERY_URL || defaultFultonQueryEndpoint).trim();
const proxyBaseUrl =
  import.meta.env.VITE_PARCEL_PROXY_BASE_URL ??
  import.meta.env.VITE_REGRID_PROXY_BASE_URL ??
  "/regrid/";

type GeocodeCandidate = {
  lat: number;
  lng: number;
  displayName?: string;
};

type ArcGisGeometry = {
  rings?: number[][][];
};

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: ArcGisGeometry | null;
};

type ArcGisQueryResponse = {
  displayFieldName?: string;
  objectIdFieldName?: string;
  features?: ArcGisFeature[];
};

function isConfigured() {
  return Boolean(queryEndpoint);
}

function buildProxyUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
  const base = proxyBaseUrl.endsWith("/") ? proxyBaseUrl : `${proxyBaseUrl}/`;
  const resolvedBase = /^https?:\/\//i.test(base)
    ? base
    : new URL(base.replace(/^\.\//, "").replace(/^\/?/, "/"), window.location.origin).toString();
  const url = new URL(path.replace(/^\/+/, ""), resolvedBase);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Parcel request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeFultonQuery(query: string) {
  const normalized = normalizeText(query);
  return /(fulton|atlanta|alpharetta|roswell|sandy springs|johns creek|milton|east point|college park|hapeville|union city|fairburn|palmetto|ga|georgia)/.test(normalized);
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new ParcelProviderUnavailableError(
      providerId,
      "Fulton County GIS is not configured yet. Add VITE_FULTON_PARCEL_QUERY_URL to enable that provider.",
    );
  }
}

function buildArcGisQueryUrl(params: Record<string, string>) {
  const normalizedEndpoint = /\/query$/i.test(queryEndpoint)
    ? queryEndpoint
    : `${queryEndpoint.replace(/\/+$/, "")}/query`;
  const url = new URL(normalizedEndpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function geocodeAddress(query: string): Promise<GeocodeCandidate | null> {
  const response = await fetchJson<{ results?: GeocodeCandidate[] }>(
    buildProxyUrl("geocode", { query }),
  );
  return response.results?.[0] ?? null;
}

function parseObjectIdField(response: ArcGisQueryResponse) {
  return response.objectIdFieldName || "OBJECTID";
}

function pickAttribute(feature: ArcGisFeature, ...keys: string[]) {
  const attributes = feature.attributes ?? {};
  for (const key of keys) {
    if (key in attributes && attributes[key] != null && attributes[key] !== "") {
      return attributes[key];
    }
  }
  return "";
}

function normalizeGeometry(geometry: ArcGisGeometry | null | undefined): GeoJSON.MultiPolygon {
  if (!geometry?.rings?.length) {
    throw new ParcelProviderGeometryError(
      providerId,
      "Fulton County GIS returned parcel geometry in an unexpected format.",
    );
  }
  return {
    type: "MultiPolygon",
    coordinates: [geometry.rings],
  };
}

function centroidFromRings(rings: number[][][]) {
  const firstRing = rings[0] ?? [];
  if (!firstRing.length) return null;
  let minLng = firstRing[0]?.[0] ?? 0;
  let maxLng = minLng;
  let minLat = firstRing[0]?.[1] ?? 0;
  let maxLat = minLat;
  for (const [lng, lat] of firstRing) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number];
}

function mapFeatureToDetail(feature: ArcGisFeature, response: ArcGisQueryResponse): ParcelDetail {
  const objectIdField = parseObjectIdField(response);
  const objectId = String(pickAttribute(feature, objectIdField, "OBJECTID", "objectid", "objectId"));
  const parcelNumber = String(
    pickAttribute(feature, "PARCEL_ID", "parcel_id", "PIN", "pin", "ACCOUNT", "account", "APN", "apn"),
  );
  const address = String(
    pickAttribute(feature, "SITE_ADDRESS", "site_address", "SITUS_ADDR", "situs_addr", "ADDRESS", "address"),
  );
  const ownerName = String(pickAttribute(feature, "OWNER_NAME", "owner_name", "OWNER", "owner"));
  const acreageValue = Number(
    pickAttribute(feature, "ACRES", "acres", "CALC_ACRES", "calc_acres", "Shape__Area"),
  );
  const geometry = normalizeGeometry(feature.geometry);
  const centroid = centroidFromRings(feature.geometry?.rings ?? []);
  return withDetailSource({
    llUuid: `fulton:${objectId}`,
    headline: address || (parcelNumber ? `Parcel ${parcelNumber}` : "Fulton County parcel"),
    address,
    apn: parcelNumber,
    ownerName,
    zoning: String(pickAttribute(feature, "ZONING", "zoning")),
    floodZone: String(pickAttribute(feature, "FLOOD_ZONE", "flood_zone")),
    areaAcres: Number.isFinite(acreageValue) ? acreageValue : 0,
    areaSqft: 0,
    county: "Fulton",
    state: "GA",
    path: "",
    sourceKey: providerId,
    sourceUrl: String(pickAttribute(feature, "PROPERTY_URL", "property_url")),
    geometry,
    centroid,
    fields: {
      ...feature.attributes,
      sourceKey: providerId,
    },
  }, {
    id: providerId,
    label: providerLabel,
  });
}

function mapFeatureToSearchResult(feature: ArcGisFeature, response: ArcGisQueryResponse): ParcelSearchResult {
  const detail = mapFeatureToDetail(feature, response);
  return withSearchResultSource({
    llUuid: detail.llUuid,
    headline: detail.headline,
    address: detail.address || detail.headline,
    context: `Fulton County, GA${detail.apn ? ` • APN ${detail.apn}` : ""}`,
    path: "",
    score: 1000,
    coordinates: detail.centroid,
    parcelNumber: detail.apn || undefined,
    acreage: detail.areaAcres || undefined,
    matchType: "provider",
    kind: "parcel",
    provider: "county-arcgis",
    sourceKey: providerId,
  }, {
    id: providerId,
    label: providerLabel,
  });
}

async function queryByPoint(input: ParcelPointInput, limit = 8) {
  assertConfigured();
  const url = buildArcGisQueryUrl({
    f: "json",
    where: "1=1",
    geometry: JSON.stringify({
      x: input.lng,
      y: input.lat,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outFields: "*",
    outSR: "4326",
    resultRecordCount: String(limit),
  });
  return fetchJson<ArcGisQueryResponse>(url);
}

async function queryByObjectId(objectId: string) {
  assertConfigured();
  const url = buildArcGisQueryUrl({
    f: "json",
    objectIds: objectId,
    returnGeometry: "true",
    outFields: "*",
    outSR: "4326",
  });
  return fetchJson<ArcGisQueryResponse>(url);
}

function mapFeaturesToDetails(response: ArcGisQueryResponse) {
  return (response.features ?? []).map((feature) => mapFeatureToDetail(feature, response));
}

export const fultonCountyProvider: ParcelProvider = {
  id: providerId,
  label: providerLabel,
  jurisdiction: "Fulton County, GA",
  supportsQuery: looksLikeFultonQuery,
  async searchParcels(query) {
    assertConfigured();
    const geocode = await geocodeAddress(query);
    if (!geocode) {
      throw new Error("We could not geocode that Fulton County address. Try a fuller Atlanta-area street address.");
    }
    const response = await queryByPoint({ lat: geocode.lat, lng: geocode.lng });
    const parcelResults = (response.features ?? []).map((feature) => mapFeatureToSearchResult(feature, response));
    if (parcelResults.length) {
      return parcelResults;
    }
    return [{
      llUuid: `geocode:${geocode.lat},${geocode.lng}`,
      headline: "Use mapped address location",
      address: geocode.displayName || query,
      context: "Fulton County address mapped, but no county parcel was found at that point yet.",
      path: "",
      score: 5000,
      coordinates: [geocode.lng, geocode.lat],
      kind: "geocode",
      provider: "none",
      providerId: providerId,
      sourceLabel: providerLabel,
      sourceKey: providerId,
    }];
  },
  async fetchParcelByUuid(llUuid) {
    const match = /^fulton:(.+)$/.exec(llUuid);
    if (!match) return null;
    const response = await queryByObjectId(match[1]);
    return mapFeaturesToDetails(response)[0] ?? null;
  },
  async fetchParcelAtPoint(input) {
    const response = await queryByPoint(input, 1);
    return mapFeaturesToDetails(response)[0] ?? null;
  },
  async fetchParcelCandidatesAtPoint(input) {
    const response = await queryByPoint(input, 6);
    return mapFeaturesToDetails(response);
  },
  async fetchParcelNeighbors(input?: ParcelNeighborsInput) {
    if (!input) return [];
    const details = await this.fetchParcelCandidatesAtPoint(input);
    return details
      .filter((detail) => detail.llUuid !== input.excludeLlUuid)
      .map((detail): ParcelNeighbor => ({
        llUuid: detail.llUuid,
        headline: detail.address || detail.headline,
        path: detail.path,
        geometry: detail.geometry,
      }));
  },
};
