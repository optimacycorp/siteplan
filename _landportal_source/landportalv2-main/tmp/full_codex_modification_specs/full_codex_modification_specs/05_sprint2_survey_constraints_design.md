# Sprint 2 — Survey + Constraints + Design Integration

## Goal
Connect parcel, title, and survey into a constraint-aware design workflow.

## Patch tasks
1. Patch survey compare logic to overlay reconstructed/title boundary against the selected parcel.
2. Patch survey compare output to show:
   - area difference
   - overlap/deviation summary
   - review issues
3. Patch constraint generation for:
   - setbacks
   - frontage
   - manual exclusions
4. Patch buildable envelope generation from parcel minus active constraints.
5. Patch design scenario metrics to use buildable envelope, not only gross parcel area.
6. Patch title-derived issues so they can appear in parcel/survey/design review context.
7. Patch designer layers to show parcel, survey compare, constraints, and buildable envelope together.

## Acceptance
- parcel vs survey compare is visible and reviewable
- buildable envelope renders
- design metrics use buildable envelope
- title-derived issues can appear in spatial review context
