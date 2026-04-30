import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../types/parcel";

const proxyBaseUrl =
  import.meta.env.VITE_REGRID_PROXY_BASE_URL ?? "/regrid/";

type OpenParcelFeature = {
  type: "Feature";
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  properties?: {
    id?: string;
    legacyLlUuid?: string;
    situsAddress?: string;
    parcelNumber?: string;
    apn?: string;
    ownerName?: string;
    acreage?: number;
    county?: string;
    state?: string;
    context?: string;
    centroid?: [number, number] | null;
    path?: string;
    fields?: Record<string, unknown>;
  };
};

function buildUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new Error((payload && typeof payload.error === "string" && payload.error) || `Parcel request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function pickCentroid(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    const first = geometry.coordinates[0]?.[0];
    return first ? [first[0], first[1]] : null;
  }
  const first = geometry.coordinates[0]?.[0]?.[0];
  return first ? [first[0], first[1]] : null;
}

function mapFeatureToDetail(feature: OpenParcelFeature | null | undefined): ParcelDetail | null {
  if (!feature?.properties) return null;
  const properties = feature.properties;
  const geometry = feature.geometry ?? null;
  return {
    llUuid: String(properties.id ?? properties.legacyLlUuid ?? ""),
    headline: String(properties.situsAddress ?? properties.id ?? "Selected parcel"),
    address: String(properties.situsAddress ?? ""),
    apn: String(properties.apn ?? properties.parcelNumber ?? ""),
    zoning: String((properties.fields ?? {}).zoning ?? ""),
    floodZone: String((properties.fields ?? {}).fema_flood_zone ?? ""),
    areaAcres: Number(properties.acreage ?? 0),
    areaSqft: 0,
    county: String(properties.county ?? ""),
    state: String(properties.state ?? ""),
    path: String(properties.path ?? ""),
    geometry,
    centroid: Array.isArray(properties.centroid) ? properties.centroid : pickCentroid(geometry),
    fields: properties.fields ?? {},
  };
}

export async function searchParcels(query: string): Promise<ParcelSearchResult[]> {
  if (!query.trim()) return [];
  return fetchJson<ParcelSearchResult[]>(buildUrl("search", { query: query.trim() }));
}

export async function fetchParcelByUuid(llUuid: string): Promise<ParcelDetail | null> {
  const response = await fetchJson<{ feature: OpenParcelFeature | null }>(
    buildUrl(`detail/${encodeURIComponent(llUuid)}`, {}),
  );
  return mapFeatureToDetail(response.feature);
}

export async function fetchParcelAtPoint(input: {
  lat: number;
  lng: number;
}): Promise<ParcelDetail | null> {
  const response = await fetchJson<{ feature: OpenParcelFeature | null }>(
    buildUrl("point", { lat: input.lat, lng: input.lng }),
  );
  return mapFeatureToDetail(response.feature);
}

function distanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreParcelCandidate(detail: ParcelDetail, point: { lat: number; lng: number }) {
  const centroid = detail.centroid;
  const distance = centroid
    ? distanceMeters(point.lat, point.lng, centroid[1], centroid[0])
    : 250;
  const acreage = Number(detail.areaAcres || 0);
  const acreagePenalty = Number.isFinite(acreage) && acreage > 0
    ? Math.min(1200, acreage * 3)
    : 150;
  const addressBonus = detail.address ? -40 : 0;
  return distance + acreagePenalty + addressBonus;
}

function dedupeParcelDetails(details: ParcelDetail[]) {
  const deduped = new Map<string, ParcelDetail>();
  for (const detail of details) {
    if (!detail.llUuid) continue;
    if (!deduped.has(detail.llUuid)) {
      deduped.set(detail.llUuid, detail);
    }
  }
  return [...deduped.values()];
}

export async function fetchParcelCandidatesAtPoint(input: {
  lat: number;
  lng: number;
}): Promise<ParcelDetail[]> {
  const [pointResponse, neighborsResponse] = await Promise.all([
    fetchJson<{ feature: OpenParcelFeature | null }>(
      buildUrl("point", { lat: input.lat, lng: input.lng }),
    ),
    fetchJson<{ features?: OpenParcelFeature[] }>(
      buildUrl("neighbors", { lat: input.lat, lng: input.lng }),
    ),
  ]);

  const pointDetail = mapFeatureToDetail(pointResponse.feature);
  const neighborDetails = (neighborsResponse.features ?? [])
    .map((feature) => mapFeatureToDetail(feature))
    .filter((detail): detail is ParcelDetail => Boolean(detail));

  return dedupeParcelDetails([
    ...(pointDetail ? [pointDetail] : []),
    ...neighborDetails,
  ]).sort((left, right) => scoreParcelCandidate(left, input) - scoreParcelCandidate(right, input));
}

export async function fetchParcelNeighbors(_input?: {
  lat: number;
  lng: number;
  excludeLlUuid?: string | null;
}): Promise<ParcelNeighbor[]> {
  const input = _input;
  const response = await fetchJson<{ features?: OpenParcelFeature[] }>(
    buildUrl("neighbors", {
      lat: input?.lat,
      lng: input?.lng,
      excludeLlUuid: input?.excludeLlUuid ?? undefined,
    }),
  );

  return (response.features ?? []).flatMap((feature) => {
    const detail = mapFeatureToDetail(feature);
    if (!detail?.geometry) return [];
    return [{
      llUuid: detail.llUuid,
      headline: detail.address || detail.headline,
      path: detail.path,
      geometry: detail.geometry,
    }];
  });
}
