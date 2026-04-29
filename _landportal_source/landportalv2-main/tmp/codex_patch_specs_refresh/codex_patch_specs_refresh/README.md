# Codex Patch Specs Refresh

This package updates the Codex patch specs to address the current reverted/unfinished state and rewrites the next sprint plans in Codex patch-task format.

It covers:

1. **Title-chain card cleanup**
   - use friendly visible chain text as the card title
   - shorten long reference strings to 40 chars with ellipsis
   - show full reference on hover via tooltip/title
   - never show raw tokenized/signed URL fragments as the visible title

2. **Blank Title Commitment stack fields**
   - restore and harden extraction/display of:
     - Status
     - Import Status
     - Order Number
     - Schedule / account
     - Date of issue
     - Effective date
     - Property address
     - Issuing company
     - Parcel snapshot
     - Role
   - ensure parsed values are written to the commitment record and returned by the workspace query

3. **Preview overlay cleanup**
   - fix popup overlay sizing/layering/scrolling issues
   - prevent overlay from obscuring or misaligning the workspace
   - improve close behavior

4. **Next sprint plans rewritten into Codex-ready patch tasks**
   - Pre-sprint hardening
   - Sprint 1 parcel foundation / map-first refactor
   - Sprint 2 survey + constraints + design integration
   - Sprint 3 polish / exports / review UX
