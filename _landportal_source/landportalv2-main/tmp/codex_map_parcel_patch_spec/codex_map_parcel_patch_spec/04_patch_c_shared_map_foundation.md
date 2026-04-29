# Patch C — Shared Map Foundation

## Goal
Use one map foundation across parcel analysis and subdivision design so parcel selection, fitting, and neighbor rendering behave consistently.

## Required behavior
- parcel page and designer share a common map wrapper or common layer/state model
- parcel anchor state is reusable
- map camera behavior is reusable
- parcel layers are reusable

## Recommendation
Use MapLibre as the shared foundation. MapLibre GL JS is a TypeScript/WebGL map library designed for interactive maps and vector/raster styling, which fits the intended direction for parcel display and design overlays. citeturn994638search0turn994638search10

## Acceptance criteria
- parcel layer logic is not duplicated unnecessarily
- fit-to-parcel behavior works the same in both views
- adjoining parcel rendering works from the same shared data source
