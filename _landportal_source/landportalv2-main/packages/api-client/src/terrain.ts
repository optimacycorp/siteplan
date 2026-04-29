type TerrainCoordinate = {
  lng: number;
  lat: number;
};

type LocalPoint = {
  x: number;
  y: number;
};

export type TerrainPointSample = {
  lng: number;
  lat: number;
  elevationFt: number;
  slopePercent: number;
  aspectDegrees: number;
  sourceName: string;
  sourceResolution: string;
  sampledAt: string;
};

export type ParcelTerrainSummary = {
  sourceName: string;
  sourceResolution: string;
  minElevationFt: number;
  maxElevationFt: number;
  meanElevationFt: number;
  slopePercentAverage: number;
  slopePercentMax: number;
  terrainReliefFt: number;
  suitability: "low" | "moderate" | "strong";
  sampledAt: string;
};

export type TerrainSourceMetadata = {
  sourceName: string;
  status: "foundation" | "connected";
  coverage: string;
  notes: string;
};

function round(value: number, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function syntheticElevation({ lng, lat }: TerrainCoordinate) {
  return 5400 + Math.sin(lng * 12) * 180 + Math.cos(lat * 10) * 140;
}

export async function fetchTerrainSourceMetadata(): Promise<TerrainSourceMetadata> {
  return {
    sourceName: "Terrain foundation preview",
    status: "foundation",
    coverage: "Point elevation, relief estimates, and parcel summary heuristics",
    notes: "Wire this service to USGS 3DEP or an internal terrain proxy in the next integration sprint.",
  };
}

export async function fetchTerrainPointSample(input: TerrainCoordinate): Promise<TerrainPointSample> {
  const elevationFt = syntheticElevation(input);
  const slopePercent = Math.max(1, Math.abs(Math.sin(input.lng * 18) * 9) + Math.abs(Math.cos(input.lat * 14) * 6));
  const aspectDegrees = ((Math.atan2(Math.sin(input.lng * 8), Math.cos(input.lat * 8)) * 180) / Math.PI + 360) % 360;

  return {
    lng: round(input.lng, 6),
    lat: round(input.lat, 6),
    elevationFt: round(elevationFt, 1),
    slopePercent: round(slopePercent, 1),
    aspectDegrees: round(aspectDegrees, 0),
    sourceName: "Terrain foundation preview",
    sourceResolution: "conceptual",
    sampledAt: new Date().toISOString(),
  };
}

export async function fetchParcelTerrainSummary(input: {
  parcelId: string;
  polygon: LocalPoint[];
  buildableAreaAcres?: number | null;
}): Promise<ParcelTerrainSummary> {
  const xs = input.polygon.map((point) => point.x);
  const ys = input.polygon.map((point) => point.y);
  const width = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const height = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  const reliefSeed = Math.max(6, Math.min(96, width * 0.18 + height * 0.12));
  const baseElevation = 5380 + (input.parcelId.length % 9) * 22;
  const minElevationFt = round(baseElevation, 1);
  const maxElevationFt = round(baseElevation + reliefSeed, 1);
  const meanElevationFt = round((minElevationFt + maxElevationFt) / 2, 1);
  const slopePercentAverage = round(Math.max(1.5, reliefSeed / Math.max(width + height, 40) * 100), 1);
  const slopePercentMax = round(Math.max(slopePercentAverage + 2, slopePercentAverage * 1.7), 1);
  const terrainReliefFt = round(maxElevationFt - minElevationFt, 1);
  const suitability =
    slopePercentAverage > 12 ? "low" : slopePercentAverage > 6 ? "moderate" : "strong";

  return {
    sourceName: "Terrain foundation preview",
    sourceResolution: "parcel heuristic",
    minElevationFt,
    maxElevationFt,
    meanElevationFt,
    slopePercentAverage,
    slopePercentMax,
    terrainReliefFt,
    suitability,
    sampledAt: new Date().toISOString(),
  };
}
