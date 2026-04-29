# Codex Prompt Templates

## Prompt 1 — Supporting stack filter

Update `apps/web/src/modules/title/ProjectTitlePage.tsx`.

Goal:
Fix the Supporting record stack so it does not show title-import child documents after delete or unlink.

Requirements:
- preserve the current supported document types
- exclude title-linked child docs using existing fields in the model
- do not remove legitimate non-title survey/deed/plat/easement documents
- make the minimum possible change

Acceptance criteria:
- documents with role `title_linked_record` do not render in the Supporting record stack
- normal supporting docs still render

Do not redesign the page.

---

## Prompt 2 — Full chain text titles

Update `apps/web/src/modules/title/titleCommitmentParser.ts`.

Goal:
Use the full visible chain text as the default child document title whenever available.

Requirements:
- preserve current exports
- do not fetch remote documents in this file
- do not remove the synthetic fallback entirely
- only use synthetic fallback if no visible chain/reference text exists

Acceptance criteria:
- for the sample package, the first child title becomes
  `El Paso county recorded 02/27/2020 under reception no. 220028404`
- titles like `linked document 1` are not used when visible chain text exists

Make the smallest possible change.

---

## Prompt 3 — Query invalidation

Update `apps/web/src/modules/title/useTitleCommitments.ts`.

Goal:
Ensure delete and unlink mutations invalidate all queries needed to remove stale title-linked docs from the UI.

Requirements:
- preserve current mutation names if possible
- invalidate title workspace query
- invalidate project development/project documents query
- do not redesign unrelated hooks

Acceptance criteria:
- after delete/unlink, stale title-linked docs are not left visible in the supporting stack
