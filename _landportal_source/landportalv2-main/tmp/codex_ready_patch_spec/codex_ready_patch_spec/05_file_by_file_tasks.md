# File-by-File Tasks

## File 1
`apps/web/src/modules/title/ProjectTitlePage.tsx`

### Task A — Fix supporting record stack filter
Find the code that computes `supportingDocuments`.

Change it so it excludes title-import child documents.

### Requirements
- preserve existing supported document types
- exclude title-linked child docs using the best available field in the current model
- do not remove legitimate non-title survey/deed/plat/easement records

### Acceptance
After delete/unlink, title-import child docs no longer appear in the Supporting record stack.

### Task B — Ensure query invalidation after delete/unlink
Confirm the delete/unlink mutations trigger refetch/invalidation for any queries that feed:
- title workspace
- project development / project documents

If invalidation is missing, add it in the appropriate hook file rather than this page when possible.

---

## File 2
`apps/web/src/modules/title/titleCommitmentParser.ts`

### Task A — Improve title selection precedence
Find the logic that synthesizes fallback titles for linked records.

Change the precedence so the parser prefers:
1. visible chain text
2. matched reference text
3. existing non-synthetic title
4. readable URL-derived label
5. synthetic fallback

### Requirements
- preserve current parser exports
- do not remove fallback generation entirely
- only use synthetic fallback when no visible chain text was matched

### Acceptance
For the sample package, the first linked record title is:
`El Paso county recorded 02/27/2020 under reception no. 220028404`

---

## File 3
`apps/web/src/modules/title/titleChainTileModel.ts`
If this file exists, patch it. If not, patch the equivalent tile-mapping logic wherever it currently lives.

### Task A — Make display title deterministic
Use the same precedence as the parser:
1. visible chain/reference text
2. sourceReferenceText
3. stored title if non-synthetic
4. readable URL label
5. fallback

### Task B — Detect synthetic titles
Add a small helper such as:
`isSyntheticLinkedDocumentTitle(title: string): boolean`

It should return true for patterns like:
- `linked document 1`
- `county recorded linked document 2`

### Acceptance
Tiles no longer prefer synthetic fallback titles when a better visible reference exists.

---

## File 4
`apps/web/src/modules/title/useTitleCommitments.ts`

### Task A — Ensure query invalidation
After delete or unlink mutations succeed, invalidate:
- title workspace query
- project/project development documents query

### Acceptance
UI does not continue to display stale title-linked docs after delete/unlink.
