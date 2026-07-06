import { describe, expect, it, vi } from "vitest";
import {
  fetchArcGisLayerMetadata,
  importArcGisLayer,
  normalizeArcGisLayerUrl,
} from "./arcgisService";

describe("arcgisService", () => {
  it("normalizes ArcGIS layer URLs", () => {
    expect(
      normalizeArcGisLayerUrl("https://example.com/arcgis/rest/services/Test/FeatureServer/0?f=pjson"),
    ).toBe("https://example.com/arcgis/rest/services/Test/FeatureServer/0");
  });

  it("rejects service URLs without a layer id", () => {
    expect(() =>
      normalizeArcGisLayerUrl("https://example.com/arcgis/rest/services/Test/FeatureServer"),
    ).toThrow(/specific ArcGIS layer URL/i);
  });

  it("loads metadata from a public ArcGIS layer response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          name: "Parcels",
          geometryType: "esriGeometryPolygon",
          objectIdField: "OBJECTID",
          spatialReference: { wkid: 4326 },
        }),
      })),
    );

    const metadata = await fetchArcGisLayerMetadata("https://example.com/FeatureServer/0");
    expect(metadata.name).toBe("Parcels");
    expect(metadata.objectIdField).toBe("OBJECTID");

    vi.unstubAllGlobals();
  });

  it("imports an ArcGIS layer through metadata and GeoJSON query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: "Hydrants",
            geometryType: "esriGeometryPoint",
            objectIdField: "OBJECTID",
            spatialReference: { wkid: 4326 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () =>
            JSON.stringify({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { name: "Hydrant A" },
                  geometry: { type: "Point", coordinates: [-104.9, 38.88] },
                },
              ],
            }),
        }),
    );

    const result = await importArcGisLayer("https://example.com/FeatureServer/0");
    expect(result.importResult.ok).toBe(true);
    if (result.importResult.ok) {
      expect(result.importResult.layer.sourceType).toBe("arcgis");
      expect(result.importResult.layer.sourceUrl).toContain("/FeatureServer/0");
    }

    vi.unstubAllGlobals();
  });
});
