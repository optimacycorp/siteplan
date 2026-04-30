import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../types/parcel";

const proxyBaseUrl =
  import.meta.env.VITE_REGRID_PROXY_BASE_URL ?? "http://localhost:8787/regrid/";

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
  const url = new URL(path.replace(/^\/+/, ""), base);
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
