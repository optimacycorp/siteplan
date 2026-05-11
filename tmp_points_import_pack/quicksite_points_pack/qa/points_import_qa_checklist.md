# Points Import QA Checklist

## Build / smoke

- [ ] `pnpm install` or `npm install` succeeds.
- [ ] `pnpm build` or `npm run build` succeeds.
- [ ] Existing parcel search still works.
- [ ] Existing drawing wizard still works.
- [ ] Existing export preview still works.

## Local CSV import

- [ ] Sample CSV imports with no errors.
- [ ] Header aliases work for X/Y and north/east naming.
- [ ] Invalid numeric rows show a clear error.
- [ ] Missing origin blocks preview/import.
- [ ] Feet and meters produce different but expected positions.
- [ ] Rotation changes point layout in expected direction.
- [ ] Scale factor changes point spacing.

## Map display

- [ ] Imported points show on map.
- [ ] Imported point labels show on map.
- [ ] Layer toggle hides points.
- [ ] Layer toggle hides point labels.
- [ ] Imported points appear above parcel layer.
- [ ] Imported points do not break drawing vertex editing.

## Persistence

- [ ] Imported points persist after refresh.
- [ ] Transform settings persist after refresh.
- [ ] Clear imported points works.
- [ ] Reset session does not leave orphaned point labels.

## Export

- [ ] Export session includes imported points.
- [ ] Export preview displays points.
- [ ] Print sheet includes point import summary.
- [ ] Disclaimer appears on export/details.

## Accuracy / UX

- [ ] UI clearly says local coordinate import is a planning/exhibit overlay.
- [ ] UI does not imply imported coordinates are survey-grade.
- [ ] User can see origin, rotation, units, and point count.
- [ ] The feature remains understandable to a non-surveyor user.
