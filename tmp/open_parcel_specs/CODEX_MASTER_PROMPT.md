# Codex Master Prompt

You are working in the Siteplan / Optimacy QuickSite repository.

Implement a provider-neutral parcel lookup system to replace the current hard dependency on Regrid.

Constraints:
- Do not remove the current Regrid proxy in the first patch.
- Do not expose provider API tokens to the browser.
- Prefer Supabase/PostGIS for parcel lookup.
- Use county/state open GIS services as fallback loaders.
- Regrid must be optional and disabled by default for Colorado.
- Preserve the existing AddressSearch and map UX, but change labels from “Regrid” to “parcel provider.”
- Use TypeScript types for the frontend parcel response.
- Add clear `not_found` responses instead of throwing when no parcel is available.

Patch sequence:
1. Add database schema from `PATCH-01-schema-supabase-postgis.sql`.
2. Add provider abstraction from `PATCH-02-node-provider-abstraction.md`.
3. Add El Paso County loader from `PATCH-03-arcgis-loader-el-paso.md`.
4. Refactor frontend service names from Regrid-specific to provider-neutral using `PATCH-04-react-service-refactor.md`.
5. Add import run tracking and refresh scripts from `PATCH-05-import-and-refresh-jobs.md`.
6. Add tests from `PATCH-06-test-plan.md`.

Validation commands:
```bash
pnpm install
pnpm build
node --check server/openParcelProxy.mjs
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --dry-run --limit 25
```
