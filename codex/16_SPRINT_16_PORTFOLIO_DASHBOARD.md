# Codex Patch 16 - Portfolio Dashboard

## Intent

Expose the app as a job-ready GIS analyst portfolio so reviewers can immediately see the technical breadth behind the product.

## Existing anchors

- `src/App.tsx`
- `src/components/AppShell.tsx`
- `docs/`
- `codex/05_SPRINT_5_GIS_DATA_MANAGER.md`
- `codex/15_SPRINT_15_ARCGIS_PRO_WORKFLOW.md`

## Required changes

1. Add a `/portfolio` route or `PortfolioMode` component.
2. Add cards for:
   - ArcGIS Online integration
   - GeoJSON and Shapefile workflow
   - PostGIS geodatabase
   - Python GIS worker
   - Network analysis
   - 3D and LiDAR digitizing
   - SQL Server compatibility
   - Business and EMSI analysis
3. Add screenshots or documentation links for each capability.
4. Add a "Skills demonstrated" section for reviewer context.

## UX requirements

- The portfolio view should feel intentional and review-friendly, not like an internal debug screen.
- Each card should link to an implemented module, export artifact, or doc.

## Acceptance checks

- A reviewer can open the portfolio view and immediately understand the skills represented in the application.
- Portfolio content maps clearly back to implemented app modules and docs.
