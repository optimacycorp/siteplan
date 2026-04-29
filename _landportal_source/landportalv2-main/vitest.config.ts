import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@landportal/core-geometry": path.resolve(__dirname, "packages/core-geometry/src/index.ts"),
      "@landportal/core-subdivision": path.resolve(__dirname, "packages/core-subdivision/src/index.ts"),
      "@landportal/core-siteplanner": path.resolve(__dirname, "packages/core-siteplanner/src/index.ts"),
      "@landportal/core-parcel": path.resolve(__dirname, "packages/core-parcel/src/index.ts"),
      "@landportal/core-survey": path.resolve(__dirname, "packages/core-survey/src/index.ts"),
      "@landportal/map-core": path.resolve(__dirname, "packages/map-core/src/index.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
