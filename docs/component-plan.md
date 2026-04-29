# Component Plan

## Proposed file tree

```text
src/
  App.tsx
  main.tsx
  styles.css
  components/
    AppShell.tsx
    AddressSearch.tsx
    DrawingToolbar.tsx
    LayerPanel.tsx
    ParcelSummary.tsx
    PropertiesPanel.tsx
    ui/
      Button.tsx
      Field.tsx
      LoadingState.tsx
  map/
    QuickMapCanvas.tsx
    basemapRegistry.ts
    mapLayerManager.ts
    mapLayers.ts
    mapUtils.ts
  services/
    geocodeService.ts
    regridParcelService.ts
    terrainService.ts
    exportService.ts
  state/
    quickSiteStore.ts
    drawingStore.ts
  types/
    parcel.ts
    drawing.ts
    map.ts
```

## Component responsibilities

### AppShell
Owns the three-pane layout:

- top product bar
- left workflow panel
- center map
- right details/properties panel

### AddressSearch
Simple address input and result list.

It should know only about search text, result selection, and loading/error states. It should not know about drawings or exports.

### QuickMapCanvas
MapLibre renderer derived from existing `BaseMapCanvas`.

Responsibilities:

- initialize map
- set basemap
- register/update layers
- bind map click/hover events
- fit selected parcel bounds

### mapLayers.ts
Converts app state into MapLibre layer descriptors:

- selected parcel fill/outline
- adjoining parcels
- drawn structures
- drawn lines
- label points
- dimension lines

### DrawingToolbar
Controls active drawing mode.

Initial modes:

- select
- proposed structure
- driveway
- easement
- label
- dimension
- delete

### ParcelSummary
Shows only what a first-time user needs:

- address
- APN
- acreage
- county/state
- zoning if available
- source/provider note

### PropertiesPanel
Shows selected drawing details or selected parcel details.

### LayerPanel
Simple toggles only. Avoid advanced opacity/technical labels in MVP.

### Stores
Use Zustand:

- `quickSiteStore`: selected parcel, basemap, layer visibility, project/title-block fields
- `drawingStore`: draw mode, features, selected feature, undo/delete

## UI simplification rule

Every MVP screen should answer one of these questions:

1. Where is the property?
2. What do I want to draw?
3. What should appear on the exhibit?
4. Can I export it?

Anything else belongs outside this repo for now.
