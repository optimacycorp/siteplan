import { describe, expect, it } from "vitest";
import {
  buildProjectGeoJson,
  importCsvLayer,
  importGeoJsonLayer,
} from "./gisImportService";

describe("gisImportService", () => {
  it("imports GeoJSON features into a GIS layer", () => {
    const result = importGeoJsonLayer(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Test polygon" },
            geometry: {
              type: "Polygon",
              coordinates: [[[-104.9, 38.87], [-104.89, 38.87], [-104.89, 38.88], [-104.9, 38.87]]],
            },
          },
        ],
      }),
      "test.geojson",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.layer.featureCount).toBe(1);
    expect(result.layer.geometryTypes).toContain("Polygon");
  });

  it("imports CSV point layers when longitude and latitude columns exist", () => {
    const result = importCsvLayer("name,longitude,latitude\nCP1,-104.9,38.88", "points.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.layer.featureCount).toBe(1);
    expect(result.layer.geometryTypes).toEqual(["Point"]);
  });

  it("builds a combined export with drawings and GIS layers", () => {
    const csvResult = importCsvLayer("name,longitude,latitude\nCP1,-104.9,38.88", "points.csv");
    expect(csvResult.ok).toBe(true);
    if (!csvResult.ok) return;

    const featureCollection = buildProjectGeoJson({
      drawings: [
        {
          id: "drawing-1",
          label: "Driveway 1",
          type: "driveway-line",
          createdAt: "2026-07-06T00:00:00.000Z",
          points: [
            { lng: -104.9, lat: 38.88 },
            { lng: -104.89, lat: 38.881 },
          ],
        },
      ],
      gisLayers: [csvResult.layer],
    });

    expect(featureCollection.features).toHaveLength(2);
  });
});
