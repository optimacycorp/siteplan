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

const providerId = "maricopa-county-az";
const providerLabel = "Maricopa County Assessor";
const defaultMaricopaQueryEndpoint =
  "https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query";
const queryEndpoint = String(import.meta.env.VITE_MARICOPA_PARCEL_QUERY_URL || defaultMaricopaQueryEndpoint).trim();
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

type ArcGisErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    details?: string[];
  };
};

type Envelope = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
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
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const arcGisError =
    payload &&
    typeof payload === "object" &&
    "error" in payload
      ? (payload as ArcGisErrorPayload).error
      : null;

  if (!response.ok || arcGisError) {
    const message =
      arcGisError?.message ||
      (payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Parcel request failed (${response.status})`);

    if (/service .* not started|temporarily unavailable|service unavailable/i.test(message)) {
      throw new ParcelProviderUnavailableError(
        providerId,
        "Maricopa County parcel service is temporarily offline. The map is centered on the address, but parcel boundaries are unavailable right now.",
      );
    }

    throw new Error(message);
  }

  return payload as T;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeMaricopaQuery(query: string) {
  const normalized = normalizeText(query);
  return /(maricopa|phoenix|tempe|scottsdale|mesa|glendale|chandler|gilbert|peoria|surprise|avondale|goodyear|buckeye|paradise valley|litchfield park|sun city|fountain hills|apache junction|az|arizona)/.test(normalized);
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new ParcelProviderUnavailableError(
      providerId,
      "Maricopa County Assessor parcel service is not configured yet. Add VITE_MARICOPA_PARCEL_QUERY_URL to enable that provider.",
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

function metersToLatitudeDegrees(meters: number) {
  return meters / 111_320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const cosine = Math.cos((latitude * Math.PI) / 180);
  const safeCosine = Math.max(0.2, Math.abs(cosine));
  return meters / (111_320 * safeCosine);
}

function buildEnvelopeAroundPoint(input: ParcelPointInput, radiusMeters: number): Envelope {
  const latDelta = metersToLatitudeDegrees(radiusMeters);
  const lngDelta = metersToLongitudeDegrees(radiusMeters, input.lat);
  return {
    xmin: input.lng - lngDelta,
    ymin: input.lat - latDelta,
    xmax: input.lng + lngDelta,
    ymax: input.lat + latDelta,
  };
}

async function geocodeAddress(query: string): Promise<GeocodeCandidate | null> {
  const response = await fetchJson<{ results?: GeocodeCandidate[] }>(
    buildProxyUrl("geocode", { query }),
  );
  return response.results?.[0] ?? null;
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
      "Maricopa County returned parcel geometry in an unexpected format.",
    );
  }
  return {
    type: "MultiPolygon",
    coordinates: [geometry.rings],
  };
}

function centroidFromFeature(feature: ArcGisFeature) {
  const latitude = Number(pickAttribute(feature, "LATITUDE", "latitude"));
  const longitude = Number(pickAttribute(feature, "LONGITUDE", "longitude"));
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return [longitude, latitude] as [number, number];
  }
  const firstRing = feature.geometry?.rings?.[0] ?? [];
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

function distanceMeters(fromLng: number, fromLat: number, toLng: number, toLat: number) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shapeAreaSquareMetersToAcres(shapeArea: number) {
  return shapeArea * 0.00024710538146717;
}

function mapFeatureToDetail(feature: ArcGisFeature): ParcelDetail {
  const objectId = String(pickAttribute(feature, "OBJECTID", "objectid", "objectId"));
  const apn = String(pickAttribute(feature, "APN", "APN_DASH", "BOOK", "MAP", "ITEM"));
  const address = String(pickAttribute(feature, "PHYSICAL_ADDRESS"));
  const ownerName = String(pickAttribute(feature, "OWNER_NAME"));
  const geometry = normalizeGeometry(feature.geometry);
  const centroid = centroidFromFeature(feature);
  const landSize = Number(pickAttribute(feature, "LAND_SIZE"));
  const shapeArea = Number(pickAttribute(feature, "Shape_Area", "shape_area"));
  const areaAcres = Number.isFinite(landSize) && landSize > 0
    ? landSize
    : Number.isFinite(shapeArea) && shapeArea > 0
      ? shapeAreaSquareMetersToAcres(shapeArea)
      : 0;

  const sourceUrl = apn
    ? `https://mcassessor.maricopa.gov/parcel/${encodeURIComponent(apn)}`
    : "";

  return withDetailSource({
    llUuid: `maricopa:${objectId}`,
    headline: address || (apn ? `Parcel ${apn}` : "Maricopa County parcel"),
    address,
    apn,
    ownerName,
    zoning: String(pickAttribute(feature, "CITY_ZONING")),
    floodZone: "",
    areaAcres,
    areaSqft: 0,
    county: "Maricopa",
    state: "AZ",
    path: "",
    sourceKey: providerId,
    sourceUrl,
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

function mapFeatureToSearchResult(feature: ArcGisFeature): ParcelSearchResult {
  const detail = mapFeatureToDetail(feature);
  return withSearchResultSource({
    llUuid: detail.llUuid,
    headline: detail.headline,
    address: detail.address || detail.headline,
    context: `Maricopa County, AZ${detail.apn ? ` • APN ${detail.apn}` : ""}`,
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

async function queryByEnvelope(input: ParcelPointInput, limit = 12, radiusMeters = 25) {
  assertConfigured();
  const envelope = buildEnvelopeAroundPoint(input, radiusMeters);
  const url = buildArcGisQueryUrl({
    f: "json",
    where: "1=1",
    geometry: JSON.stringify({
      ...envelope,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: "esriGeometryEnvelope",
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
  return (response.features ?? []).map((feature) => mapFeatureToDetail(feature));
}

function scoreDetailForPoint(detail: ParcelDetail, input: ParcelPointInput) {
  const centroid = detail.centroid;
  const centroidDistance = centroid
    ? distanceMeters(input.lng, input.lat, centroid[0], centroid[1])
    : 150;
  const acreagePenalty = detail.areaAcres > 0 ? Math.min(250, detail.areaAcres * 2) : 50;
  const addressBonus = detail.address ? -15 : 0;
  return centroidDistance + acreagePenalty + addressBonus;
}

async function findBestDetailsForPoint(input: ParcelPointInput, limit = 8) {
  const direct = await queryByPoint(input, limit);
  let details = mapFeaturesToDetails(direct);
  if (!details.length) {
    const nearby = await queryByEnvelope(input, Math.max(limit, 10), 30);
    details = mapFeaturesToDetails(nearby);
  }
  return details.sort((left, right) => scoreDetailForPoint(left, input) - scoreDetailForPoint(right, input));
}

export const maricopaCountyProvider: ParcelProvider = {
  id: providerId,
  label: providerLabel,
  jurisdiction: "Maricopa County, AZ",
  supportsQuery: looksLikeMaricopaQuery,
  async searchParcels(query) {
    assertConfigured();
    const geocode = await geocodeAddress(query);
    if (!geocode) {
      throw new Error("We could not geocode that Maricopa County address. Try a fuller Phoenix-area street address.");
    }
    const details = await findBestDetailsForPoint({ lat: geocode.lat, lng: geocode.lng });
    const parcelResults = details.map((detail) =>
      withSearchResultSource({
        llUuid: detail.llUuid,
        headline: detail.headline,
        address: detail.address || detail.headline,
        context: `Maricopa County, AZ${detail.apn ? ` • APN ${detail.apn}` : ""}`,
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
      }),
    );
    if (parcelResults.length) {
      return parcelResults;
    }
    return [{
      llUuid: `geocode:${geocode.lat},${geocode.lng}`,
      headline: "Use mapped address location",
      address: geocode.displayName || query,
      context: "Maricopa County address mapped, but no county parcel was found at that point yet.",
      path: "",
      score: 5000,
      coordinates: [geocode.lng, geocode.lat],
      kind: "geocode",
      provider: "none",
      providerId,
      sourceLabel: providerLabel,
      sourceKey: providerId,
    }];
  },
  async fetchParcelByUuid(llUuid) {
    const match = /^maricopa:(.+)$/.exec(llUuid);
    if (!match) return null;
    const response = await queryByObjectId(match[1]);
    return mapFeaturesToDetails(response)[0] ?? null;
  },
  async fetchParcelAtPoint(input) {
    return (await findBestDetailsForPoint(input, 1))[0] ?? null;
  },
  async fetchParcelCandidatesAtPoint(input) {
    return findBestDetailsForPoint(input, 6);
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
