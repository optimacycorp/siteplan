export function geometryBounds(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): [[number, number], [number, number]] | null {
  const coords = geometry.type === "Polygon" ? geometry.coordinates.flat(1) : geometry.coordinates.flat(2);
  if (!coords.length) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng); minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng); maxLat = Math.max(maxLat, lat);
  });
  return [[minLng, minLat], [maxLng, maxLat]];
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatFeetLabel(distanceInMeters: number) {
  const feet = distanceInMeters * 3.28084;
  return feet >= 1000 ? `${feet.toFixed(0)} ft` : `${feet.toFixed(1)} ft`;
}

export function polygonCentroid(points: Array<{ lng: number; lat: number }>) {
  if (!points.length) return null;
  const sum = points.reduce(
    (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
    { lng: 0, lat: 0 },
  );
  return {
    lng: sum.lng / points.length,
    lat: sum.lat / points.length,
  };
}

export function polygonAreaSquareMeters(points: Array<{ lng: number; lat: number }>) {
  if (points.length < 3) return 0;
  const avgLat = points.reduce((acc, point) => acc + point.lat, 0) / points.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(toRadians(avgLat));
  const projected = points.map((point) => ({
    x: point.lng * metersPerDegLng,
    y: point.lat * metersPerDegLat,
  }));

  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

export function formatAreaLabel(squareMeters: number) {
  const squareFeet = squareMeters * 10.7639;
  if (squareFeet >= 43560) {
    return `${(squareFeet / 43560).toFixed(2)} ac`;
  }
  return `${squareFeet.toFixed(0)} sq ft`;
}

export function formatBearing(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
) {
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const deltaLng = toRadians(toLng - fromLng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const azimuth = (Math.atan2(y, x) * 180) / Math.PI;
  const normalized = (azimuth + 360) % 360;

  const quadrant =
    normalized <= 90
      ? { ns: "N", angle: normalized, ew: "E" }
      : normalized <= 180
        ? { ns: "S", angle: 180 - normalized, ew: "E" }
        : normalized <= 270
          ? { ns: "S", angle: normalized - 180, ew: "W" }
          : { ns: "N", angle: 360 - normalized, ew: "W" };

  const degrees = Math.floor(quadrant.angle);
  const minutesFloat = (quadrant.angle - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);

  return `${quadrant.ns} ${degrees.toString().padStart(2, "0")}°${minutes
    .toString()
    .padStart(2, "0")}'${seconds.toString().padStart(2, "0")}" ${quadrant.ew}`;
}
