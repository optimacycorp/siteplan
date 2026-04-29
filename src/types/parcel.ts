export type ParcelSearchResult = {
  llUuid: string;
  address: string;
  context: string;
  path: string;
  score: number;
  coordinates: [number, number] | null;
  kind?: "parcel" | "geocode";
};

export type ParcelDetail = {
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

export type ParcelNeighbor = {
  llUuid: string;
  headline: string;
  path: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};
