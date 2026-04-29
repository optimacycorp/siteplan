# Issue 1 — Supporting Record Stack Still Shows Old Documents After Delete

## Problem
After deleting a title commitment or unlinking title-linked child documents, the **Supporting record stack** still shows old records.

## Root cause
The supporting record stack is currently derived from the broader project document library, not from the subset that should remain visible in that section.

Likely behavior:
- delete/unlink removes title relationship rows
- underlying `project_documents` rows remain
- `projectDevelopment.documents` still includes those rows
- UI keeps showing them because the supporting stack filter is too broad

## Desired behavior
The Supporting record stack should **not** show title-import child records unless they are explicitly intended to appear there.

## Required patch
In `ProjectTitlePage.tsx`, change the supporting stack filter so it excludes documents created as title-chain child imports.

### Explicit rule
Exclude documents where either of these is true:
- `document.documentRole === "title_linked_record"`
- `document.sourceCommitmentId` is set
- or metadata indicates the record came from title import

Use the fields actually present in your codebase. Prefer `documentRole` first if available.

## Also required
After delete or unlink operations, invalidate/refetch:
- title workspace query
- project development/project documents query

This prevents stale UI data.

## Acceptance criteria
- deleting a title commitment removes its chain docs from the commitment stack
- supporting record stack no longer shows those title-linked child docs
- unlinking a child doc removes it from the commitment stack without leaving stale UI in the supporting stack
