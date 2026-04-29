# Codex Patch 03 - Print Preview and PDF Export

## Intent

Create a clean print/export experience for a planning exhibit.

## Add

- `src/components/PrintPreview.tsx`
- `src/services/exportService.ts`
- Title block fields in `quickSiteStore`
- Print stylesheet

## Print fields

- Project/exhibit title
- Address
- APN
- Date
- Prepared by
- Notes
- Disclaimer

Default disclaimer:

> Conceptual planning exhibit only. Not a boundary survey, improvement survey plat, or construction document. Parcel geometry and measurements are approximate and should be verified by a licensed professional where required.

## Export approach

MVP: browser print to PDF.

Later: server-side Playwright export for exact repeatable output.

## Acceptance checks

- Print preview fits letter and 11x17 landscape.
- North arrow and scale note appear.
- Parcel, drawings, labels, and title block are included.
- Export button launches print flow.
