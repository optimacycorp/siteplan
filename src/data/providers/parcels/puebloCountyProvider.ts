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

const providerId = "pueblo-county-co";
const providerLabel = "Pueblo County Assessor";
const defaultPuebloQueryEndpoint =
  "https://maps.co.pueblo.co.us/outside/rest/services/Landbase/PuebloCounty_Parcels/MapServer/1/query";
const queryEndpoint = String(import.meta.env.VITE_PUEBLO_PARCEL_QUERY_URL || defaultPuebloQueryEndpoint).trim();
const defaultPuebloAddressQueryEndpoint =
  "https://maps.co.pueblo.co.us/outside/rest/services/Landbase/PuebloCounty_AddressPoints/MapServer/0/query";
const addressQueryEndpoint = String(
  import.meta.env.VITE_PUEBLO_ADDRESS_QUERY_URL || defaultPuebloAddressQueryEndpoint,
).trim();
const fallbackEnvelopeRadiusMeters = Number(import.meta.env.VITE_PUEBLO_CLICK_TOLERANCE_METERS || 80);
const expandedEnvelopeRadiusMeters = Math.max(
  fallbackEnvelopeRadiusMeters * 2,
  Number(import.meta.env.VITE_PUEBLO_CLICK_TOLERANCE_MAX_METERS || 180),
);
const proxyBaseUrl =
  import.meta.env.VITE_PARCEL_PROXY_BASE_URL ??
  import.meta.env.VITE_REGRID_PROXY_BASE_URL ??
  "/regrid/";

type GeocodeCandidate = {
  lat: number;
  lng: number;
  displayName?: string;
};

type ArcGisPointGeometry = {
  x?: number;
  y?: number;
};

function hasRingGeometry(
  geometry: ArcGisGeometry | ArcGisPointGeometry | null | undefined,
): geometry is ArcGisGeometry {
  return Boolean(geometry && "rings" in geometry && Array.isArray(geometry.rings));
}

type ArcGisGeometry = {
  rings?: number[][][];
};

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: ArcGisGeometry | ArcGisPointGeometry | null;
};

type ArcGisQueryResponse = {
  displayFieldName?: string;
  objectIdFieldName?: string;
  features?: ArcGisFeature[];
};

type ArcGisFindResult = {
  layerId?: number;
  layerName?: string;
  displayFieldName?: string;
  attributes?: Record<string, unknown>;
  geometry?: ArcGisGeometry | null;
};

type ArcGisFindResponse = {
  results?: ArcGisFindResult[];
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

function isAddressConfigured() {
  return Boolean(addressQueryEndpoint);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeSqlLike(value: string) {
  return value.replace(/'/g, "''");
}

function extractStreetAddress(query: string) {
  const [street] = query.split(",");
  return street?.trim() || query.trim();
}

function extractCity(query: string) {
  const parts = query.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[1] : "";
}

function extractZip(query: string) {
  const match = query.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : "";
}

function looksLikePuebloQuery(query: string) {
  const normalized = normalizeText(query);
  return /\b(pueblo|pueblo west|beulah|rye|avondale|boone)\b/.test(normalized);
}

function looksLikeParcelIdentifier(query: string) {
  const compact = query.trim().replace(/[^a-z0-9]/gi, "");
  return /^\d{6,}$/.test(compact);
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
        "Pueblo County parcel service is temporarily offline. The map is centered on the address, but parcel boundaries are unavailable right now.",
      );
    }

    throw new Error(message);
  }

  return payload as T;
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new ParcelProviderUnavailableError(
      providerId,
      "Pueblo County parcel service is not configured yet. Add VITE_PUEBLO_PARCEL_QUERY_URL to enable that provider.",
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

function buildArcGisServiceUrl(baseEndpoint: string, params: Record<string, string>) {
  const normalizedEndpoint = /\/query$/i.test(baseEndpoint)
    ? baseEndpoint
    : `${baseEndpoint.replace(/\/+$/, "")}/query`;
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
      "Pueblo County returned parcel geometry in an unexpected format.",
    );
  }
  return {
    type: "MultiPolygon",
    coordinates: [geometry.rings],
  };
}

function centroidFromFeature(feature: ArcGisFeature) {
  const firstRing = hasRingGeometry(feature.geometry) ? feature.geometry.rings?.[0] ?? [] : [];
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

function squareMetersToAcres(squareMeters: number) {
  return squareMeters * 0.00024710538146717;
}

function squareMetersToSquareFeet(squareMeters: number) {
  return squareMeters * 10.7639;
}

function normalizeApn(apn: string) {
  return apn.replace(/[^0-9]/g, "");
}

function mapFeatureToDetail(feature: ArcGisFeature, response: ArcGisQueryResponse): ParcelDetail {
  const objectIdField = parseObjectIdField(response);
  const objectId = String(pickAttribute(feature, objectIdField, "OBJECTID", "objectid", "objectId"));
  const parcelNumber = String(
    pickAttribute(feature, "PAR_TXT", "ScheduleNumber", "SCHEDNUM", "PARCELNO", "APN"),
  );
  const address = String(
    pickAttribute(
      feature,
      "SitAddr",
      "SITADDR",
      "SITE_ADDR",
      "PROPERTY_ADDRESS",
      "Address",
      "PROPADDR",
    ),
  );
  const ownerName = String(
    pickAttribute(feature, "Owner", "OwnerName", "OWNER_NAME", "Owner1"),
  );
  const shapeArea = Number(pickAttribute(feature, "Shape__Area", "Shape_Area", "SHAPE_Area"));
  const areaSqft = Number.isFinite(shapeArea) && shapeArea > 0 ? squareMetersToSquareFeet(shapeArea) : 0;
  const areaAcres = Number.isFinite(shapeArea) && shapeArea > 0 ? squareMetersToAcres(shapeArea) : 0;
  const geometry = normalizeGeometry(hasRingGeometry(feature.geometry) ? feature.geometry : null);
  const centroid = centroidFromFeature(feature);
  const apnDigits = normalizeApn(parcelNumber);
  const sourceUrl = apnDigits
    ? `https://puebloco-search.gsacorp.io/parcel/${encodeURIComponent(apnDigits)}`
    : "";

  return withDetailSource({
    llUuid: `pueblo:${objectId}`,
    headline: address || (parcelNumber ? `Parcel ${parcelNumber}` : "Pueblo County parcel"),
    address,
    apn: parcelNumber,
    ownerName,
    zoning: String(pickAttribute(feature, "Zone", "Zoning")),
    floodZone: "",
    areaAcres,
    areaSqft,
    county: "Pueblo",
    state: "CO",
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

function mapFeatureToSearchResult(feature: ArcGisFeature, response: ArcGisQueryResponse): ParcelSearchResult {
  const detail = mapFeatureToDetail(feature, response);
  return withSearchResultSource({
    llUuid: detail.llUuid,
    headline: detail.headline,
    address: detail.address || detail.headline,
    context: `Pueblo County, CO${detail.apn ? ` • APN ${detail.apn}` : ""}`,
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

async function queryByParcelText(query: string, limit = 8) {
  assertConfigured();
  const escaped = query.trim().replace(/'/g, "''");
  const url = buildArcGisQueryUrl({
    f: "json",
    where: `UPPER(PAR_TXT) LIKE '%${escaped.toUpperCase()}%'`,
    returnGeometry: "true",
    outFields: "*",
    outSR: "4326",
    resultRecordCount: String(limit),
  });
  return fetchJson<ArcGisQueryResponse>(url);
}

function mapFeaturesToDetails(response: ArcGisQueryResponse) {
  return (response.features ?? []).map((feature) => mapFeatureToDetail(feature, response));
}

function scoreDetailForPoint(detail: ParcelDetail, input: ParcelPointInput) {
  const centroid = detail.centroid;
  const centroidDistance = centroid
    ? distanceMeters(input.lng, input.lat, centroid[0], centroid[1])
    : 150;
  const acreagePenalty = detail.areaAcres > 0 ? Math.min(250, detail.areaAcres * 3) : 50;
  const addressBonus = detail.address ? -20 : 0;
  return centroidDistance + acreagePenalty + addressBonus;
}

async function findBestDetailsForPoint(input: ParcelPointInput, limit = 8) {
  const direct = await queryByPoint(input, limit);
  let details = mapFeaturesToDetails(direct);
  if (!details.length) {
    const nearby = await queryByEnvelope(input, Math.max(limit, 10), fallbackEnvelopeRadiusMeters);
    details = mapFeaturesToDetails(nearby);
  }
  if (!details.length && expandedEnvelopeRadiusMeters > fallbackEnvelopeRadiusMeters) {
    const expanded = await queryByEnvelope(input, Math.max(limit, 14), expandedEnvelopeRadiusMeters);
    details = mapFeaturesToDetails(expanded);
  }
  return details.sort((left, right) => scoreDetailForPoint(left, input) - scoreDetailForPoint(right, input));
}

async function findCountyAddressPoint(query: string) {
  if (!isAddressConfigured()) {
    return null;
  }
  const streetAddress = extractStreetAddress(query);
  if (!streetAddress) {
    return null;
  }
  const city = extractCity(query).toUpperCase();
  const zip = extractZip(query);
  const tokens = normalizeText(streetAddress)
    .split(" ")
    .filter((token) => token.length > 1 || /^\d+$/.test(token))
    .filter((token) => !["street", "st", "avenue", "ave", "road", "rd", "place", "pl", "drive", "dr", "court", "ct", "lane", "ln", "boulevard", "blvd"].includes(token));
  const tokenClauses = tokens
    .map((token) => {
      const escapedToken = escapeSqlLike(token.toUpperCase());
      return `(UPPER(FULLADDR) LIKE '%${escapedToken}%' OR UPPER(ALT_ADDR1) LIKE '%${escapedToken}%' OR UPPER(ALT_ADDR2) LIKE '%${escapedToken}%')`;
    })
    .join(" AND ");
  const filters = [tokenClauses || `UPPER(FULLADDR) LIKE '%${escapeSqlLike(streetAddress.toUpperCase())}%'`];
  if (city) {
    filters.push(`UPPER(CITY) = '${escapeSqlLike(city)}'`);
  }
  if (zip) {
    filters.push(`ZIP = ${Number(zip)}`);
  }
  const url = buildArcGisServiceUrl(addressQueryEndpoint, {
    f: "json",
    where: filters.join(" AND "),
    returnGeometry: "true",
    outFields: "FULLADDR,ALT_ADDR1,ALT_ADDR2,ASSESSOR_PARTEXT,CITY,ZIP",
    outSR: "4326",
    resultRecordCount: "5",
  });
  const response = await fetchJson<ArcGisQueryResponse>(url);
  const feature = response.features?.[0];
  const pointGeometry = feature?.geometry as ArcGisPointGeometry | undefined;
  if (!feature || !pointGeometry || !Number.isFinite(pointGeometry.x) || !Number.isFinite(pointGeometry.y)) {
    return null;
  }
  return {
    lat: Number(pointGeometry.y),
    lng: Number(pointGeometry.x),
    displayName: String(pickAttribute(feature, "FULLADDR", "ALT_ADDR1", "ALT_ADDR2")),
    parcelText: String(pickAttribute(feature, "ASSESSOR_PARTEXT")),
  };
}

export const puebloCountyProvider: ParcelProvider = {
  id: providerId,
  label: providerLabel,
  jurisdiction: "Pueblo County, CO",
  supportsQuery: looksLikePuebloQuery,
  async searchParcels(query) {
    assertConfigured();

    if (looksLikeParcelIdentifier(query)) {
      const identifierResponse = await queryByParcelText(query, 8);
      const identifierResults = (identifierResponse.features ?? []).map((feature) =>
        mapFeatureToSearchResult(feature, identifierResponse),
      );
      if (identifierResults.length) {
        return identifierResults;
      }
    }

    const countyAddressPoint = await findCountyAddressPoint(query);
    if (countyAddressPoint) {
      const parcelText = countyAddressPoint.parcelText?.trim();
      if (parcelText) {
        const parcelByAddressPoint = await queryByParcelText(parcelText, 4);
        const parcelByAddressPointResults = (parcelByAddressPoint.features ?? []).map((feature) =>
          mapFeatureToSearchResult(feature, parcelByAddressPoint),
        );
        if (parcelByAddressPointResults.length) {
          return parcelByAddressPointResults;
        }
      }
      const countyAddressMatches = await findBestDetailsForPoint(
        { lat: countyAddressPoint.lat, lng: countyAddressPoint.lng },
        8,
      );
      if (countyAddressMatches.length) {
        return countyAddressMatches.map((detail) =>
          withSearchResultSource({
            llUuid: detail.llUuid,
            headline: detail.headline,
            address: detail.address || detail.headline,
            context: `Pueblo County, CO${detail.apn ? ` • APN ${detail.apn}` : ""}`,
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
      }
      return [{
        llUuid: `geocode:${countyAddressPoint.lat},${countyAddressPoint.lng}`,
        headline: "Use mapped address location",
        address: countyAddressPoint.displayName || query,
        context: "Pueblo County address mapped, but no county parcel was found at that point yet.",
        path: "",
        score: 5000,
        coordinates: [countyAddressPoint.lng, countyAddressPoint.lat],
        kind: "geocode",
        provider: "none",
        providerId,
        sourceLabel: providerLabel,
        sourceKey: providerId,
      }];
    }

    const geocode = await geocodeAddress(query);
    if (!geocode) {
      throw new Error("We could not geocode that Pueblo County address. Try a fuller Pueblo-area street address.");
    }
    const details = await findBestDetailsForPoint({ lat: geocode.lat, lng: geocode.lng });
    const parcelResults = details.map((detail) =>
      withSearchResultSource({
        llUuid: detail.llUuid,
        headline: detail.headline,
        address: detail.address || detail.headline,
        context: `Pueblo County, CO${detail.apn ? ` • APN ${detail.apn}` : ""}`,
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
      context: "Pueblo County address mapped, but no county parcel was found at that point yet.",
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
    const match = /^pueblo:(.+)$/.exec(llUuid);
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
