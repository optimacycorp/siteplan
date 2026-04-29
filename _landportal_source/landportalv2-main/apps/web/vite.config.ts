import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@landportal/auth": path.resolve(__dirname, "../../packages/auth/src/index.ts"),
      "@landportal/api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
      "@landportal/core-survey": path.resolve(__dirname, "../../packages/core-survey/src/index.ts"),
      "@landportal/core-geometry": path.resolve(__dirname, "../../packages/core-geometry/src/index.ts"),
      "@landportal/map-core": path.resolve(__dirname, "../../packages/map-core/src/index.ts"),
      "@landportal/core-parcel": path.resolve(__dirname, "../../packages/core-parcel/src/index.ts"),
      "@landportal/core-yield": path.resolve(__dirname, "../../packages/core-yield/src/index.ts"),
      "@landportal/core-subdivision": path.resolve(__dirname, "../../packages/core-subdivision/src/index.ts"),
      "@landportal/core-siteplanner": path.resolve(__dirname, "../../packages/core-siteplanner/src/index.ts"),
      "@landportal/core-documents": path.resolve(__dirname, "../../packages/core-documents/src/index.ts"),
    },
  },
  server: {
    port: 4173,
  },
});
