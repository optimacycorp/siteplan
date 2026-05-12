import { beforeEach, describe, expect, it } from "vitest";
import { usePointImportStore } from "./pointImportStore";

describe("pointImportStore", () => {
  beforeEach(() => {
    usePointImportStore.getState().resetSession();
  });

  it("parses csv rows into preview rows", () => {
    usePointImportStore.getState().parseCsvText("point,name,northing,easting\n1,CP1,0,0");
    expect(usePointImportStore.getState().previewRows).toHaveLength(1);
    expect(usePointImportStore.getState().importError).toBe("");
  });

  it("requires an origin before previewing transformed points", () => {
    usePointImportStore.getState().parseCsvText("point,name,northing,easting\n1,CP1,0,0");
    usePointImportStore.getState().previewTransformedPoints();
    expect(usePointImportStore.getState().importError).toContain("Choose an origin");
  });

  it("commits preview points into imported points", () => {
    const store = usePointImportStore.getState();
    store.parseCsvText("point,name,northing,easting\n1,CP1,0,0");
    store.setOriginFromLngLat(-104.9, 38.88, "Origin");
    store.previewTransformedPoints();
    expect(usePointImportStore.getState().previewPoints).toHaveLength(1);
    usePointImportStore.getState().commitPreviewPoints();
    expect(usePointImportStore.getState().importedPoints).toHaveLength(1);
  });

  it("previews Emlid Flow 360 rows without a local origin", () => {
    const store = usePointImportStore.getState();
    store.setImportFormat("emlid-flow-360-csv");
    store.parseCsvText(
      "Name,Longitude,Latitude,Elevation,Description\n1,-104.83933438,38.80878427,1823.608,CP1",
    );
    store.previewTransformedPoints();
    expect(usePointImportStore.getState().previewPoints).toHaveLength(1);
    expect(usePointImportStore.getState().importError).toBe("");
  });
});
