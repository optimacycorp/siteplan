import { regridConfig } from "@/lib/regrid";

type RegridParcelFeature = {
  type: "Feature";
  id?: string | number;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  properties?: {
    ll_uuid?: string;
    headline?: string;
    path?: string;
    fields?: Record<string, unknown>;
    context?: {
      name?: string;
      headline?: string;
      path?: string;
      active?: boolean;
    };
  };
};

export type RegridParcelTileConfig = {
  id: string;
  tiles: string[];
  attribution: string;
  minzoom: number;
  maxzoom: number;
};

export type RegridParcelSearchResult = {
  llUuid: string;
  address: string;
  context: string;
  path: string;
  score: number;
  coordinates: [number, number] | null;
};

export type RegridParcelDetail = {
  llUuid: string;
  headline: string;
  address: string;
  apn: string;
  zoning: string;
  floodZone: string;
  areaAcres: number;
  areaSqft: number;
  county: string;
  state: string;
  path: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  centroid: [number, number] | null;
  fields: Record<string, unknown>;
};

export type RegridParcelNeighbor = {
  llUuid: string;
  headline: string;
  path: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

function buildUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
  const normalizedBase = regridConfig.proxyBaseUrl.endsWith("/")
    ? regridConfig.proxyBaseUrl
    : `${regridConfig.proxyBaseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, normalizedBase);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Regrid proxy request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function pickCentroid(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    const first = geometry.coordinates[0]?.[0];
    return Array.isArray(first) && first.length >= 2 ? [first[0], first[1]] : null;
  }
  const first = geometry.coordinates[0]?.[0]?.[0];
  return Array.isArray(first) && first.length >= 2 ? [first[0], first[1]] : null;
}

function mapFeatureToDetail(feature: RegridParcelFeature | undefined | null): RegridParcelDetail | null {
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

export async function fetchRegridParcelTileConfig(): Promise<RegridParcelTileConfig> {
  return fetchJson<RegridParcelTileConfig>(buildUrl("tilejson", {}));
}

export async function searchRegridParcels(query: string): Promise<RegridParcelSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return fetchJson<RegridParcelSearchResult[]>(buildUrl("search", { query: trimmed }));
}

export async function fetchRegridParcelByPoint(
  coordinate: { lng: number; lat: number },
  radius = 4,
): Promise<RegridParcelDetail | null> {
  const response = await fetchJson<{ feature: RegridParcelFeature | null }>(buildUrl("point", {
    lat: coordinate.lat,
    lng: coordinate.lng,
    radius,
  }));
  return mapFeatureToDetail(response.feature);
}

export async function fetchRegridParcelByUuid(llUuid: string): Promise<RegridParcelDetail | null> {
  if (!llUuid) return null;
  const response = await fetchJson<{ feature: RegridParcelFeature | null }>(buildUrl(`detail/${encodeURIComponent(llUuid)}`, {}));
  return mapFeatureToDetail(response.feature);
}

export async function fetchRegridParcelNeighbors(input: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  excludeLlUuid?: string | null;
}): Promise<RegridParcelNeighbor[]> {
  const response = await fetchJson<{ features?: RegridParcelFeature[] }>(buildUrl("neighbors", {
    lat: input.lat,
    lng: input.lng,
    radius: input.radius ?? 250,
    limit: input.limit ?? 24,
    exclude: input.excludeLlUuid ?? "",
  }));

  return (response.features ?? []).flatMap((feature) => {
    const llUuid = String(feature.properties?.ll_uuid ?? feature.id ?? "");
    if (!llUuid || !feature.geometry) return [];
    return [{
      llUuid,
      headline: String(feature.properties?.headline ?? feature.properties?.fields?.address ?? llUuid),
      path: String(feature.properties?.path ?? ""),
      geometry: feature.geometry,
    }];
  });
}
