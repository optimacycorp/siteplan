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
