# Codex Patch 04 - MVP Hardening and Beta Readiness

## Intent

Make the separate MVP usable for feedback without exposing advanced Land Portal complexity.

## Add/harden

- Error states for Regrid/search/detail failures
- Loading skeletons
- Empty states
- Keyboard escape to cancel drawing
- Undo last vertex / undo last feature
- Basic mobile/tablet layout
- README setup instructions
- QA checklist

## QA scenarios

1. Search known address.
2. Select parcel result.
3. Toggle parcel/adjoining layers.
4. Draw proposed structure.
5. Add driveway line.
6. Add label.
7. Refresh page and confirm draft persists.
8. Print preview/export.
9. Clear draft and start over.

## Non-goals

Do not add:

- user accounts
- title commitment upload
- survey review
- subdivision/yield calculations
- admin dashboard
- AI chat

These belong in the advanced Land Portal, not QuickSite MVP.
