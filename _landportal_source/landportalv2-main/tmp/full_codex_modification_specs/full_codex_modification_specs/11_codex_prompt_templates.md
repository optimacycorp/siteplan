# Codex Prompt Templates

## Prompt 1 — Finish title hardening
Update the title workspace so child cards use friendly visible titles, long references truncate to 40 chars with full hover text, commitment stack fields use field->metadata->fallback precedence, and the preview overlay is contained and readable.

Files:
- titleChainTileModel.ts
- TitleChainDocumentTile.tsx
- ProjectTitlePage.tsx
- ProjectTitlePage.module.css
- useTitleCommitments.ts

Requirements:
- make the minimum necessary change
- preserve current actions and preview flow
- do not use raw signed token text as visible title
- do not let empty strings win over metadata fallback

Acceptance:
- title workspace is readable and stable

## Prompt 2 — Parcel auto-fit and adjoining parcels
Update parcel selection and map/designer integration so the active parcel anchor drives viewport fit and the designer shows adjoining parcels.

Files:
- useProjectParcelSelection.ts
- MapCanvas.tsx
- designer map component
- parcel provider wrapper
- shared map layer helpers

Requirements:
- active parcel exposes geometry+bbox
- use fitBounds on initial load and parcel change
- fetch neighbors by expanded bbox
- render selected parcel strongly and adjoining parcels lightly

Acceptance:
- selected parcel auto-fits
- designer shows surrounding parcels

## Prompt 3 — Survey + constraints + buildable envelope
Update survey compare, constraint generation, and design metrics so design is based on buildable envelope rather than only gross parcel area.

Files:
- survey compare modules
- constraints modules
- design scenario modules

Requirements:
- overlay reconstructed/title geometry against parcel
- generate setbacks/frontage/manual exclusions
- compute buildable envelope
- use envelope in scenario metrics

Acceptance:
- parcel/survey compare and buildable envelope are visible and used by design metrics
