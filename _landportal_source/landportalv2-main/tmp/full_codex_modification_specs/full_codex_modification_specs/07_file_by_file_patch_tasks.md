# File-by-File Patch Tasks

## Title workspace hardening

### File
`apps/web/src/modules/title/titleChainTileModel.ts`
Task:
- add friendly title precedence
- add truncated reference display + full reference
- avoid raw token/signed URL text for visible titles

### File
`apps/web/src/modules/title/components/TitleChainDocumentTile.tsx`
Task:
- render truncated reference
- expose full reference via tooltip/title
- preserve actions (preview/open source/retry/unlink)

### File
`apps/web/src/modules/title/ProjectTitlePage.tsx`
Task:
- fix commitment field precedence
- ensure empty strings do not win over metadata fallback
- preserve preview behavior

### File
`apps/web/src/modules/title/ProjectTitlePage.module.css`
Task:
- clean up preview overlay layout

### File
`apps/web/src/modules/title/useTitleCommitments.ts`
Task:
- preserve invalidation/refetch after delete/unlink
- surface commitment fields to UI consistently

## Parcel foundation + map-first

### File
`apps/web/src/modules/parcel/useProjectParcelSelection.ts`
Task:
- expose geometry/bbox/centroid
- restore active parcel anchor on reload

### File
`apps/web/src/modules/map/MapCanvas.tsx`
Task:
- fit to parcel via bbox
- avoid repeated re-fit loops

### File
`apps/web/src/modules/design/...`
Task:
- use shared map-backed designer base
- render selected parcel
- render adjoining parcels

### File
`apps/web/src/modules/parcel/...`
Task:
- add adjoining parcel fetch by expanded bbox
- keep separate from selected parcel detail fetch

### File
shared map utility/layer files
Task:
- selected parcel layer helper
- adjoining parcel layer helper

## Survey + constraints

### File
survey compare module(s)
Task:
- overlay reconstructed boundary against parcel
- compute review metrics/issues

### File
constraints module(s)
Task:
- setbacks/frontage/manual exclusions
- buildable envelope generation

### File
design scenario module(s)
Task:
- use buildable envelope in metrics and rendering
