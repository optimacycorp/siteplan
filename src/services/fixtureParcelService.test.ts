import { describe, expect, it } from "vitest";
import {
  fetchParcelAtPoint,
  fetchParcelByUuid,
  fetchParcelCandidatesAtPoint,
  searchParcels,
} from "./fixtureParcelService";
import { RAMPART_PARCEL_ID } from "../fixtures/rampartParcelFixture";

describe("fixtureParcelService", () => {
  it("returns the Rampart parcel for fixture search", async () => {
    const results = await searchParcels("3245 Rampart Range Road");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.llUuid).toBe(RAMPART_PARCEL_ID);
  });

  it("returns the fixture parcel for an inside click", async () => {
    const detail = await fetchParcelAtPoint({ lat: 38.87837, lng: -104.897322 });
    expect(detail?.apn).toBe("7333200002");
  });

  it("returns candidate details for the fixture click point", async () => {
    const candidates = await fetchParcelCandidatesAtPoint({ lat: 38.87837, lng: -104.897322 });
    expect(candidates[0]?.llUuid).toBe(RAMPART_PARCEL_ID);
    const detail = await fetchParcelByUuid(RAMPART_PARCEL_ID);
    expect(detail?.address).toContain("Rampart Range Road");
  });
});
