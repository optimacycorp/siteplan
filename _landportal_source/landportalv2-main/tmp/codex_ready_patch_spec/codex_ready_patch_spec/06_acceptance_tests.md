# Acceptance Tests

## Test 1 — Supporting stack excludes title child docs
Given:
- a project has title-import child documents with role `title_linked_record`
- those docs still exist in `projectDevelopment.documents`

When:
- the Supporting record stack is rendered

Then:
- those title-linked child docs are not shown in that section

## Test 2 — Full visible chain text used as child title
Given:
- a parsed chain entry exists with visible text:
  `El Paso county recorded 02/27/2020 under reception no. 220028404`

When:
- a child document tile is built

Then:
- the tile title equals that full visible text

And:
- the tile title does not contain `linked document 1`

## Test 3 — Synthetic fallback remains only as final fallback
Given:
- no visible chain text exists
- no sourceReferenceText exists
- no readable stored title exists

When:
- a child title is generated

Then:
- synthetic fallback may still be used

## Test 4 — Delete/unlink refreshes UI
Given:
- a title commitment is deleted or a child doc is unlinked

When:
- the mutation succeeds

Then:
- title workspace refetches
- supporting stack refetches
- no stale title-linked child docs remain visible there
