# File-by-File Patch Tasks

## File 1
`apps/web/src/modules/title/titleChainTileModel.ts`
If this file does not exist, patch the equivalent tile mapping logic.

### Task A — Friendly title selection
Add a helper that builds the card title using this precedence:
1. visible chain text
2. sourceReferenceText
3. existing non-synthetic non-token stored title
4. readable URL-derived label
5. fallback

### Task B — Shortened reference display
Add `truncateReference(value, 40)` and expose both:
- `displayReference`
- `fullReference`

### Task C — Token detection
Add helper to detect raw signed token or URL-like strings and exclude them from visible title selection.

### Acceptance
- no raw signed URL/token appears as card title
- card uses friendly title
- reference truncates to 40 chars with tooltip support

---

## File 2
`apps/web/src/modules/title/components/TitleChainDocumentTile.tsx`
If component does not exist, patch equivalent title-chain card component.

### Task A — Render displayReference and fullReference
- show truncated reference text in the card
- set `title={fullReference}` for hover tooltip
- keep the card title separate from the reference text if both are shown

### Task B — Preserve actions
Keep:
- View stored copy
- Open original source
- Copy URL
- Retry fetch
- Unlink

### Acceptance
- hover shows full reference
- visible card is cleaner and shorter

---

## File 3
`apps/web/src/modules/title/ProjectTitlePage.tsx`

### Task A — Fix commitment card field rendering
Patch the commitment stack card so each field uses deterministic precedence:
- first-class field
- metadata fallback
- final fallback text

### Task B — Do not let empty string win
Trim values and treat empty strings as missing.

### Task C — Preview modal behavior
If the overlay state/handlers are here, keep behavior but ensure backdrop vs modal click handling remains correct.

### Acceptance
- non-blank extracted values render
- modal still opens/closes correctly

---

## File 4
`apps/web/src/modules/title/useTitleCommitments.ts`
Or equivalent title workspace data hook/service.

### Task A — Ensure workspace mapping exposes extracted fields
If parsed fields are stored but not surfaced, map them into the commitment object returned to the UI.

### Task B — Keep query invalidation
Preserve invalidation/refetch behavior after delete/unlink.

### Acceptance
- UI receives populated order/date/address/company values when present in DB or metadata

---

## File 5
`apps/web/src/modules/title/ProjectTitlePage.module.css`
Or equivalent stylesheet.

### Task A — Cleanup preview overlay styling
Patch styles for:
- backdrop
- modal card
- preview iframe/image
- scroll containment

### Acceptance
- overlay is centered, layered, and contained properly
