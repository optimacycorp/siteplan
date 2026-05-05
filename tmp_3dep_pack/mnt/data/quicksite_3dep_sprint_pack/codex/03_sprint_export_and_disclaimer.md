# Codex Patch — Sprint 3: Export Reliability + Terrain Disclaimer

## Intent

Make sure contours/terrain layers export correctly and the PDF/print sheet has appropriate attribution and planning-only language.

## Files likely involved

- `src/components/ExportOnlyApp.tsx`
- `src/components/PrintPlanSheet.tsx`
- `src/components/ExportSheetPanel.tsx`
- `src/export/exportSession.ts`
- `src/services/exportService.ts`

## Requirements

1. Export session must preserve `layerVisibility.contours`.
2. Export map must render terrain overlays if contours are visible.
3. Print sheet must include this note when contours are visible:

`Contours/elevation context shown from public USGS 3DEP/The National Map sources. For planning only; verify with survey-grade field data where required.`

4. If contours are hidden, do not add unnecessary terrain disclaimer except the existing general conceptual-plan note.
5. Export should wait for the terrain raster to load or gracefully time out.

## Acceptance criteria

- Export with contours visible includes contours.
- Export without contours visible excludes contours.
- Disclaimer appears only when terrain layer is used.
- No duplicate disclaimers.
- Build passes.
