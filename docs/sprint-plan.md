# Optimacy QuickSite MVP Sprint Plan

## Product goal

Build a separate lightweight site-plan creator that feels closer to an address-based drawing tool than a full land development intelligence portal.

Core promise:

> Enter an address, confirm a parcel, draw a simple planning exhibit, and export a clean PDF.

## Sprint 0 - Repository extraction and shell

Goal: create the separate repo and establish the minimal app shell.

Deliverables:

- New Vite React TypeScript repo
- Clean app layout: header, left workflow panel, full map canvas, right properties panel
- Basic route-free single-page workflow
- Shared UI primitives copied/adapted from Land Portal
- MapLibre installed and rendering OSM basemap
- `.env.example` with proxy and map settings

Acceptance checks:

- `pnpm install` works
- `pnpm dev` opens app
- Map renders at default Colorado Springs/Rampart Range coordinate
- No Supabase or title/document dependencies remain

## Sprint 1 - Address search and parcel selection

Goal: user can search an address and select the parcel.

Deliverables:

- Address search component
- Regrid parcel search service using proxy base URL
- Search result cards
- Click result to load parcel detail
- Map fits selected parcel
- Parcel boundary displayed as GeoJSON layer
- Adjoining parcels optional layer
- Selected parcel summary card

Acceptance checks:

- Searching `3245 Rampart Range Road, 80919, Colorado Springs, Colorado` returns candidate parcel(s)
- Selecting a result centers/fits map
- Boundary layer is visible and highlighted
- Adjoining parcels can be toggled

## Sprint 2 - Drawing and measurement tools

Goal: user can sketch basic site-plan elements.

Deliverables:

- Drawing toolbar
- Tools: proposed structure polygon, driveway/polyline, easement/polyline, label point, dimension line
- Zustand drawing store
- Editable feature names
- Basic length/area calculation helpers
- Undo/delete selected drawing
- Save/load local draft in browser localStorage

Acceptance checks:

- Drawn features remain visible after refresh
- Area and distance summaries show approximate values
- User can delete or rename a feature
- App clearly labels output as planning/conceptual, not a survey

## Sprint 3 - Layers, contours, and print preview

Goal: user can prepare a readable planning exhibit.

Deliverables:

- Layer panel: parcel, adjoining, contours, buildings, drawings, labels
- Contour placeholder/proxy integration plan
- Print-preview route or modal
- Title block fields: project name, address, date, scale note, preparer/disclaimer
- North arrow and scale bar
- PDF export method selected: browser print first, server/Playwright later

Acceptance checks:

- Print preview renders cleanly on letter/11x17
- Parcel, drawings, labels, and title block appear together
- Output has disclaimer and scale note

## Sprint 4 - MVP hardening and beta

Goal: make the tool usable for external feedback.

Deliverables:

- Error states for no parcel found/API failure
- Loading states
- Keyboard/mouse polish
- Mobile/tablet sanity pass
- Example project seed
- README and deployment notes
- QA checklist

Acceptance checks:

- Nontechnical user can complete the address-to-PDF flow in under 5 minutes
- No advanced portal concepts appear in the UI
- Regrid key is never exposed client-side
- MVP can be deployed independently

## Defer until after MVP

- Accounts/login
- Supabase persistence
- AI planner assistant
- Title/document stack
- Survey review
- Subdivision/yield engine
- Multi-project dashboard
- Paid subscriptions
