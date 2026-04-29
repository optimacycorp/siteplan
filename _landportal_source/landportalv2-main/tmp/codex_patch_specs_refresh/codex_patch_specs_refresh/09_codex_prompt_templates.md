# Codex Prompt Templates

## Prompt 1 — Title-chain card cleanup

Update the title-chain tile mapping and rendering so cards use a friendly visible title and truncated reference display.

Files:
- `apps/web/src/modules/title/titleChainTileModel.ts` or equivalent
- `apps/web/src/modules/title/components/TitleChainDocumentTile.tsx` or equivalent

Requirements:
- use visible chain text as the preferred title
- do not use raw signed URL/token text as the visible title
- truncate reference display to 40 chars with ellipsis
- expose the full reference via tooltip/title on hover
- preserve existing actions

Acceptance criteria:
- card title uses friendly chain text
- no card title shows a raw signed token
- long reference truncates cleanly and full text is visible on hover

---

## Prompt 2 — Blank commitment fields

Update the title commitment stack card and any supporting hook/service mapping.

Files:
- `apps/web/src/modules/title/ProjectTitlePage.tsx`
- `apps/web/src/modules/title/useTitleCommitments.ts` or equivalent

Requirements:
- show extracted values for order number, schedule/account, date of issue, effective date, property address, and issuing company
- use first-class field first, metadata fallback second
- do not let empty string win over available metadata
- make the minimum possible change

Acceptance criteria:
- commitment stack values render when extracted data exists
- metadata fallback works consistently

---

## Prompt 3 — Preview overlay cleanup

Update the preview modal styling and behavior.

Files:
- `apps/web/src/modules/title/ProjectTitlePage.tsx`
- `apps/web/src/modules/title/ProjectTitlePage.module.css`

Requirements:
- centered modal
- contained iframe/image preview
- correct backdrop layering
- backdrop click closes, modal click does not

Acceptance criteria:
- preview overlay no longer distorts the page
- preview is readable and contained
