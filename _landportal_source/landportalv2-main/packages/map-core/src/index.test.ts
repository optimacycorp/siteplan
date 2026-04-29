import { describe, expect, it } from "vitest";

import { buildProjectMapCollections } from "./index";

describe("map-core", () => {
  it("builds point and line feature collections from local survey geometry", () => {
    const result = buildProjectMapCollections(
      [
        { id: "p1", name: "Point 1", code: "CP", easting: 10, northing: 20 },
        { id: "p2", name: "Point 2", code: "P", easting: 40, northing: 60 },
      ],
      [{ id: "s1", from: "p1", to: "p2", label: "tie" }],
      { lng: -104.8, lat: 38.83, zoom: 16 },
    );

    expect(result.points.features).toHaveLength(2);
    expect(result.lines.features).toHaveLength(1);
    expect(result.bounds[0][0]).toBeLessThan(result.bounds[1][0]);
    expect(result.bounds[0][1]).toBeLessThan(result.bounds[1][1]);
    expect(result.center).toEqual([-104.8, 38.83]);
    expect(result.zoom).toBe(16);
  });

  it("returns anchor-centered fallback bounds when there are no points", () => {
    const result = buildProjectMapCollections([], [], { lng: -104.8, lat: 38.83, zoom: 15.5 });

    expect(result.points.features).toHaveLength(0);
    expect(result.lines.features).toHaveLength(0);
    expect(result.center).toEqual([-104.8, 38.83]);
    expect(result.zoom).toBe(15.5);
  });
});
