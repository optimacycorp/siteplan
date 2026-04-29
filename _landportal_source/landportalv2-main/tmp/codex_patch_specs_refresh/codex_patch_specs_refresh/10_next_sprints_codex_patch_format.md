# Next Sprints Rewritten In Codex Patch Format

## Pre-Sprint hardening
Goal:
Stabilize title commitment import, child title-chain rendering, and preview/delete behavior before the larger spatial work.

Patch tasks:
1. fix title-chain friendly titles and truncated references
2. fix blank commitment fields
3. fix supporting stack filtering after delete/unlink
4. fix preview overlay
5. keep retry/unlink/query invalidation stable

Acceptance:
- title workspace is stable and readable
- commitment stack fields populate correctly
- no stale title-linked docs remain in supporting stack

---

## Sprint 1 — Parcel foundation + map-first refactor
Goal:
Make parcel selection persistent and move the workflow onto a real map-first shell.

Codex patch-task style:
- patch parcel selection flow to persist one active parcel anchor per project
- patch map page and parcel page to use shared map foundation
- patch design console shell to reduce chrome and increase map real estate
- patch label system to support Minimal / Review / Sheet modes
- do not redesign the whole data model in one pass; preserve working flows

Acceptance:
- project has one active parcel anchor
- map is the primary workspace
- labels are cleaner by default

---

## Sprint 2 — Survey + constraints + design integration
Goal:
Tie parcel, title, and survey into a buildable-envelope workflow.

Codex patch-task style:
- patch survey compare logic to overlay reconstructed boundary against parcel
- patch constraint generation for setbacks/frontage/manual exclusions
- patch design scenario metrics to use buildable envelope
- patch title issue display so title-derived review items appear in parcel/survey context

Acceptance:
- parcel vs survey compare is visible
- buildable envelope renders
- design metrics use envelope, not just gross parcel

---

## Sprint 3 — Polish / reporting / exports
Goal:
Make review/export flows usable and polished.

Codex patch-task style:
- patch export/report views for title missing references and survey compare summary
- patch review badges/legends/empty states
- patch sheet/export UX for clarity

Acceptance:
- core outputs export cleanly
- review UX is presentation-ready
