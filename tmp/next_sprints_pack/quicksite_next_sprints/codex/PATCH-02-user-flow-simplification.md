# Codex Patch 02 - User Flow Simplification

## Intent

Make QuickSite feel like a simple guided site-plan creator instead of a technical GIS tool.

## Product target

A first-time user should understand the workflow without instruction:

1. Find the property.
2. Confirm the parcel.
3. Draw the exhibit.
4. Export the plan.

## Files to modify

- `src/App.tsx`
- `src/components/AppShell.tsx`
- `src/components/AddressSearch.tsx`
- `src/components/ParcelSummary.tsx`
- `src/components/DrawingToolbar.tsx`
- `src/components/LayerPanel.tsx`
- `src/components/PropertiesPanel.tsx`
- `src/styles.css`
- `src/state/quickSiteStore.ts`

## Add files

- `src/components/WorkflowSteps.tsx`
- `src/components/SelectedParcelCard.tsx`
- `src/components/EmptyState.tsx`
- `src/components/InlineNotice.tsx`

## Implementation steps

### 1. Add workflow status model

In `quickSiteStore`, add computed-friendly state fields or selectors:

- `selectedParcel`
- `searchResults.length`
- `drawings.length` from drawing store can be passed into component
- `exportReady` should be true when a parcel exists and at least one drawing or label exists

No need to over-engineer. A component can derive these statuses.

### 2. Add `WorkflowSteps`

Create a top or left-panel component showing four steps:

- Find
- Confirm
- Draw
- Export

Each step should have status:

- `current`
- `done`
- `locked`

Keep labels plain and human:

- “Find property”
- “Confirm parcel”
- “Draw plan”
- “Export PDF”

### 3. Simplify `AddressSearch`

Change the helper text from technical examples to a clearer prompt:

> Start with the property address. If the parcel boundary is not selected automatically, click the parcel on the map.

Search result cards should show:

- Main address/headline.
- APN if available.
- Acres if available.
- A plain tag: “Best match”, “Nearby parcel”, or “Mapped address only”.

Hide provider/source/path details unless user expands “More details.”

### 4. Add selected parcel confirmation

Create `SelectedParcelCard` with:

- Address/APN.
- “Use this parcel” confirmation state.
- “Change parcel” action that clears selected parcel and neighbors but keeps search text.

For MVP, selecting a parcel can automatically count as confirmed, but the UI should still visually show confirmation.

### 5. Simplify layer controls

Move advanced layers under a collapsed section:

Always visible:

- Aerial/Streets basemap.
- Parcel boundary toggle.
- Drawings toggle.

Advanced collapsed:

- Adjoining parcels.
- Contours.
- Buildings.

### 6. Improve empty states

Use `EmptyState` for:

- No selected parcel.
- No drawings.
- No search results.

Avoid blank panels.

### 7. Add status language

Add a topbar subtitle that changes:

- No parcel: “Search for a property to begin.”
- Parcel selected, no drawings: “Draw the proposed improvement or add a label.”
- Drawings exist: “Ready to preview or export.”

## Acceptance criteria

- The UI exposes a clear four-step workflow.
- Provider/source details are not visible by default.
- A nontechnical tester can identify the next step without being told.
- Layer panel is shorter and less intimidating.
- The app still has no routes and no login.

## Non-goals

- Do not add onboarding modals.
- Do not add project dashboards.
- Do not add paid-plan/account UI.
