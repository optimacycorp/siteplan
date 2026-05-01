# Codex Patch 01 - Build Foundation and Map Stability

## Intent

Make the MVP reproducible in a fresh clone and stabilize MapLibre custom layers during basemap changes.

## Current observations

- `package.json` uses `pnpm` scripts and packageManager metadata.
- The repo should explicitly support `corepack enable` to install the correct pnpm version.
- `QuickMapCanvas` calls `setStyle()` on basemap changes and re-registers custom layers. This needs to be hardened because style switches remove app-added sources/layers.
- The app needs a fixture mode so UI work can continue without parcel API credentials.

## Files to modify

- `README.md`
- `.env.example` or create it if missing
- `package.json`
- `src/map/QuickMapCanvas.tsx`
- `src/map/mapLayerManager.ts`
- `src/map/mapLayers.ts`
- `src/services/openParcelService.ts`
- `src/state/quickSiteStore.ts`

## Add files

- `scripts/check-env.mjs`
- `src/fixtures/rampartParcelFixture.ts`
- `src/services/fixtureParcelService.ts`
- `src/services/parcelService.ts`
- `src/components/DevStatusPanel.tsx`

## Implementation steps

### 1. Add environment check script

Create `scripts/check-env.mjs` that checks:

- Node major version is at least 20.
- `pnpm` is available.
- Warns when `VITE_REGRID_PROXY_BASE_URL` is missing.
- Warns when fixture mode is off and no proxy base URL exists.

Add script:

```json
"check:env": "node scripts/check-env.mjs"
```

### 2. Add fixture parcel mode

Add env flag:

```bash
VITE_USE_PARCEL_FIXTURES=false
VITE_REGRID_PROXY_BASE_URL=http://localhost:8787/regrid/
VITE_DEFAULT_CENTER_LNG=-104.897322
VITE_DEFAULT_CENTER_LAT=38.878370
VITE_DEFAULT_ZOOM=17
```

Create `src/services/parcelService.ts` that exports the app-facing functions:

- `searchParcels`
- `fetchParcelByUuid`
- `fetchParcelAtPoint`
- `fetchParcelCandidatesAtPoint`
- `fetchParcelNeighbors`

Internally select fixture service when `VITE_USE_PARCEL_FIXTURES === "true"`; otherwise use `openParcelService`.

Update imports in `AddressSearch.tsx` and `QuickMapCanvas.tsx` to use `../services/parcelService` instead of `regridParcelService`.

### 3. Harden map style switching

In `QuickMapCanvas.tsx`:

- Replace the single `map.once("styledata", ...)` approach after `setStyle()` with `map.once("style.load", ...)`.
- Add a helper `syncAppLayers()` that checks `map.isStyleLoaded()` before calling `registerMapLayers`.
- Store current `layers` in a ref so style-load callbacks always re-register the latest descriptors.

Pseudo-structure:

```ts
const layersRef = useRef(layers);
useEffect(() => { layersRef.current = layers; }, [layers]);

function syncAppLayers(map: maplibregl.Map) {
  if (!map.isStyleLoaded()) return;
  registerMapLayers(map, layersRef.current);
}
```

On basemap change:

```ts
map.setStyle(getBasemapDefinition(basemap).style);
map.once("style.load", () => syncAppLayers(map));
```

### 4. Add stable layer ordering

In `mapLayerManager.ts`, define an array order:

```ts
const APP_LAYER_ORDER = [
  "neighbors-fill",
  "neighbors-outline",
  "parcel-fill",
  "parcel-outline",
  "drawing-polygons-fill",
  "drawing-polygons-outline",
  "drawing-lines",
  "active-sketch",
  "drawing-labels",
];
```

When adding layers, insert each layer before the next existing app layer when possible. This prevents labels/fills from stacking incorrectly after a style change.

### 5. Add dev status panel

Create a small `DevStatusPanel` visible only when:

```ts
import.meta.env.DEV
```

Show:

- Fixture mode on/off.
- Proxy base URL.
- Selected parcel id/APN.
- Drawing count.

Place it bottom-left over the map or in the right panel.

## Acceptance criteria

- `corepack enable && pnpm install && pnpm build` succeeds.
- `VITE_USE_PARCEL_FIXTURES=true pnpm dev` loads without a live API.
- Basemap switching does not remove parcel/drawing/label layers.
- Address search imports reference `parcelService`, not `regridParcelService`.
- Dev status panel is hidden in production builds.

## Non-goals

- Do not add accounts.
- Do not add Supabase UI.
- Do not redesign the whole app shell in this patch.
