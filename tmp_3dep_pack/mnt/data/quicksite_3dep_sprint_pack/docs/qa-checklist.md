# 3DEP / Contour QA Checklist

## Functional QA

- [ ] App builds with `pnpm build`.
- [ ] App runs with `pnpm dev`.
- [ ] Contours are off by default.
- [ ] Turning on contours adds visible terrain/contour context.
- [ ] Turning off contours hides the overlay.
- [ ] Switching basemaps preserves the selected contour visibility state.
- [ ] Contours do not cover parcel/drawing/label layers.
- [ ] Parcel boundary and drawings remain visible over contours.
- [ ] Export preview includes contours when the contour layer is visible.
- [ ] Export preview excludes contours when the contour layer is hidden.

## UX QA

- [ ] The control label is understandable to non-GIS users.
- [ ] The terrain note is short and not alarming.
- [ ] The core workflow still reads Find → Confirm → Draw → Export.
- [ ] Terrain controls do not compete with drawing controls.

## Performance QA

- [ ] Map remains responsive at parcel zoom levels.
- [ ] Contour layer does not repeatedly add duplicate sources/layers.
- [ ] No console errors when toggling contours repeatedly.
- [ ] No console errors when changing basemaps with contours on.
- [ ] Slow/failing public service degrades gracefully.

## Planning/legal disclaimer QA

- [ ] Export sheet has terrain disclaimer.
- [ ] In-app terrain panel has planning-only warning.
- [ ] The wording does not imply a surveyed contour/topographic map.
