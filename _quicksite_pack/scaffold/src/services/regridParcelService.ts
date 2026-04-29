import type { ParcelDetail, ParcelNeighbor, ParcelSearchResult } from "../types/parcel";

const proxyBaseUrl = import.meta.env.VITE_REGRID_PROXY_BASE_URL ?? "http://localhost:8787/regrid/";

type RegridParcelFeature = {
  type: "Feature";
  id?: string | number;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  properties?: {
    ll_uuid?: string;
    headline?: string;
    path?: string;
    fields?: Record<string, unknown>;
    context?: { name?: string; headline?: string; path?: string; active?: boolean };
  };
};

function buildUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
  const base = proxyBaseUrl.endsWith("/") ? proxyBaseUrl : `${proxyBaseUrl}/`;
  const url = new URL(path.replace(/^\/+/, ""), base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Parcel request failed (${response.status})`);
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

function mapFeatureToDetail(feature: RegridParcelFeature | null | undefined): ParcelDetail | null {
  if (!feature?.properties) return null;
  const fields = feature.properties.fields ?? {};
  const geometry = feature.geometry ?? null;
  return {
    llUuid: String(feature.properties.ll_uuid ?? feature.id ?? ""),
    headline: String(feature.properties.headline ?? fields.address ?? "Selected parcel"),
    address: String(fields.address ?? feature.properties.headline ?? ""),
    apn: String(fields.parcelnumb ?? fields.parcelnumb_no_formatting ?? ""),
    zoning: String(fields.zoning ?? fields.ll_zoning_backup ?? ""),
    floodZone: String(fields.fema_flood_zone ?? ""),
    areaAcres: Number(fields.ll_gisacre ?? fields.gisacre ?? 0),
    areaSqft: Number(fields.ll_gissqft ?? fields.sqft ?? 0),
    county: String(fields.county ?? ""),
    state: String(fields.state2 ?? ""),
    path: String(feature.properties.path ?? ""),
    geometry,
    centroid: pickCentroid(geometry),
    fields,
  };
}

export async function searchParcels(query: string): Promise<ParcelSearchResult[]> {
  if (!query.trim()) return [];
  return fetchJson<ParcelSearchResult[]>(buildUrl("search", { query }));
}

export async function fetchParcelByUuid(llUuid: string): Promise<ParcelDetail | null> {
  const response = await fetchJson<{ feature: RegridParcelFeature | null }>(buildUrl(`detail/${encodeURIComponent(llUuid)}`, {}));
  return mapFeatureToDetail(response.feature);
}

export async function fetchParcelNeighbors(input: { lat: number; lng: number; excludeLlUuid?: string | null }): Promise<ParcelNeighbor[]> {
  const response = await fetchJson<{ features?: RegridParcelFeature[] }>(buildUrl("neighbors", { lat: input.lat, lng: input.lng, radius: 250, limit: 24, exclude: input.excludeLlUuid ?? "" }));
  return (response.features ?? []).flatMap((feature) => {
    const llUuid = String(feature.properties?.ll_uuid ?? feature.id ?? "");
    if (!llUuid || !feature.geometry) return [];
    return [{ llUuid, headline: String(feature.properties?.headline ?? feature.properties?.fields?.address ?? llUuid), path: String(feature.properties?.path ?? ""), geometry: feature.geometry }];
  });
}
