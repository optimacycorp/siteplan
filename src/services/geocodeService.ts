export type GeocodeResult = { label: string; lng: number; lat: number };

export async function geocodeAddress(_query: string): Promise<GeocodeResult[]> {
  throw new Error("Geocoding is deferred. Use parcel search first for MVP.");
}
