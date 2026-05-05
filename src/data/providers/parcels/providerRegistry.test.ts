import { describe, expect, it } from "vitest";
import { describeParcelSource, resolveProviderForParcelId, resolveSearchProvider } from "./providerRegistry";

describe("providerRegistry", () => {
  it("routes Fulton-style address searches to the Fulton provider", () => {
    const provider = resolveSearchProvider("141 Pryor Street SW, Atlanta, GA");
    expect(provider.id).toBe("fulton-county-ga");
  });

  it("routes Fulton parcel ids back to the Fulton provider", () => {
    const provider = resolveProviderForParcelId("fulton:12345");
    expect(provider.id).toBe("fulton-county-ga");
  });

  it("formats provider source labels for the summary UI", () => {
    expect(describeParcelSource("co-el-paso-county-parcels", "")).toBe("El Paso County parcel cache");
    expect(describeParcelSource("fulton-county-ga", "")).toBe("Fulton County GIS");
  });
});
