import { describe, expect, it } from "vitest";
import { describeParcelSource, resolveProviderForParcelId, resolveSearchProvider } from "./providerRegistry";

describe("providerRegistry", () => {
  it("routes Fulton-style address searches to the Fulton provider", () => {
    const provider = resolveSearchProvider("141 Pryor Street SW, Atlanta, GA");
    expect(provider.id).toBe("fulton-county-ga");
  });

  it("routes Phoenix-area address searches to the Maricopa provider", () => {
    const provider = resolveSearchProvider("111 S 3rd Ave, Phoenix, AZ 85003");
    expect(provider.id).toBe("maricopa-county-az");
  });

  it("routes Fulton parcel ids back to the Fulton provider", () => {
    const provider = resolveProviderForParcelId("fulton:12345");
    expect(provider.id).toBe("fulton-county-ga");
  });

  it("routes Maricopa parcel ids back to the Maricopa provider", () => {
    const provider = resolveProviderForParcelId("maricopa:12345");
    expect(provider.id).toBe("maricopa-county-az");
  });

  it("formats provider source labels for the summary UI", () => {
    expect(describeParcelSource("co-el-paso-county-parcels", "")).toBe("El Paso County parcel cache");
    expect(describeParcelSource("fulton-county-ga", "")).toBe("Fulton County GIS");
    expect(describeParcelSource("maricopa-county-az", "")).toBe("Maricopa County Assessor");
  });
});
