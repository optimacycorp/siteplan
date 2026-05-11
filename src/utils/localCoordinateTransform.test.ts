import { describe, expect, it } from "vitest";
import { transformLocalCoordinate } from "./localCoordinateTransform";
import type { LocalPointTransform } from "../types/fieldPoint";

const baseTransform: LocalPointTransform = {
  mode: "local-xy",
  units: "meters",
  origin: { lng: -104.9, lat: 38.88, label: "Origin" },
  rotationDegrees: 0,
  scaleFactor: 1,
};

describe("localCoordinateTransform", () => {
  it("keeps the origin at the origin coordinates", () => {
    const transformed = transformLocalCoordinate({ northing: 0, easting: 0 }, baseTransform);
    expect(transformed.lng).toBeCloseTo(-104.9, 8);
    expect(transformed.lat).toBeCloseTo(38.88, 8);
  });

  it("moves northing toward higher latitude", () => {
    const transformed = transformLocalCoordinate({ northing: 10, easting: 0 }, baseTransform);
    expect(transformed.lat).toBeGreaterThan(baseTransform.origin!.lat);
  });

  it("moves easting toward higher longitude", () => {
    const transformed = transformLocalCoordinate({ northing: 0, easting: 10 }, baseTransform);
    expect(transformed.lng).toBeGreaterThan(baseTransform.origin!.lng);
  });

  it("converts feet to meters before applying deltas", () => {
    const feetTransform: LocalPointTransform = {
      ...baseTransform,
      units: "feet",
    };
    const transformedFeet = transformLocalCoordinate({ northing: 10, easting: 0 }, feetTransform);
    const transformedMeters = transformLocalCoordinate({ northing: 3.048, easting: 0 }, baseTransform);
    expect(transformedFeet.lat).toBeCloseTo(transformedMeters.lat, 8);
  });

  it("rotates local north clockwise into map east at 90 degrees", () => {
    const rotated = transformLocalCoordinate(
      { northing: 10, easting: 0 },
      { ...baseTransform, rotationDegrees: 90 },
    );
    expect(rotated.lng).toBeGreaterThan(baseTransform.origin!.lng);
    expect(rotated.lat).toBeCloseTo(baseTransform.origin!.lat, 5);
  });
});
