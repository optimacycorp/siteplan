# Next Sprints Rewritten In Codex Patch Format

## Next Patch Group — Parcel Foundation
Goal:
Make parcel selection the system anchor and auto-fit the map/designer to it.

Patch tasks:
1. patch parcel selection model to expose geometry + bbox
2. patch map canvas to auto-fit selected parcel
3. patch project reload flow to restore and fit active parcel
4. patch designer to highlight selected parcel

Acceptance:
- parcel selection drives viewport and active state

---

## Next Patch Group — Adjoining Parcel Context
Goal:
Give the designer real surrounding parcel context.

Patch tasks:
1. patch parcel provider wrapper to fetch neighbors by bbox
2. patch designer to render adjoining parcels
3. patch map layers so selected parcel remains dominant
4. keep neighbor labels off by default

Acceptance:
- designer shows surrounding parcels cleanly

---

## Sprint 2 — Survey + constraints + design integration
Goal:
Tie parcel, title, and survey into a buildable-envelope workflow.

Patch tasks:
1. patch survey compare logic to overlay reconstructed boundary against parcel
2. patch constraint generation for setbacks/frontage/manual exclusions
3. patch design metrics to use buildable envelope
4. patch title issue display in parcel/survey context

Acceptance:
- parcel vs survey compare is visible
- buildable envelope renders
- design metrics use envelope

---

## Sprint 3 — Polish / reporting / exports
Goal:
Make outputs reviewable and polished.

Patch tasks:
1. patch export/report views for title missing references and survey compare summary
2. patch legends, badges, and empty states
3. patch sheet/export UX for clarity

Acceptance:
- core outputs export cleanly
- review UX is presentation-ready
