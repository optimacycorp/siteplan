# Codex Patch 04 - Print Preview and PDF Export

## Intent

Replace bare `window.print()` behavior with a true planning-exhibit preview and browser-PDF export path.

## Files to modify

- `src/components/AppShell.tsx`
- `src/services/exportService.ts`
- `src/state/quickSiteStore.ts`
- `src/styles.css`
- `src/App.tsx`

## Add files

- `src/components/PrintPreview.tsx`
- `src/components/TitleBlockForm.tsx`
- `src/components/NorthArrow.tsx`
- `src/components/ScaleNote.tsx`
- `src/types/export.ts`

## Implementation steps

### 1. Add exhibit/title block state

In `quickSiteStore`, add:

```ts
exhibitTitle: string;
preparedBy: string;
notes: string;
paperSize: "letter-landscape" | "tabloid-landscape";
showPrintPreview: boolean;
setExhibitField: (...);
setShowPrintPreview: (...);
```

Default title:

```ts
"Conceptual Site Plan"
```

Default disclaimer:

> Conceptual planning exhibit only. Not a boundary survey, improvement survey plat, or construction document. Parcel geometry and measurements are approximate and should be verified by a licensed professional where required.

### 2. Add title block form

Add a compact form in the right panel or export step:

- Exhibit title.
- Prepared by.
- Notes.
- Paper size.

Pre-fill address/APN from selected parcel but allow title/notes edits.

### 3. Add print preview overlay/mode

Create `PrintPreview` that renders:

- Map container clone/print area placeholder.
- Title block.
- Address/APN.
- Date.
- Prepared by.
- Notes.
- Disclaimer.
- North arrow.
- Scale note: “Scale varies by print settings; verify before relying on dimensions.”

For this MVP patch, use the same live map area in print CSS if duplicating MapLibre into preview is too much. The key is to hide app panels and produce clean layout on print.

### 4. Update export service

Change `printToPdf()` to:

- Set print preview visible if not already visible.
- Use `requestAnimationFrame` or short `setTimeout` before calling `window.print()`.

Do not introduce server-side Playwright yet.

### 5. Add print styles

In `styles.css`:

- Hide topbar/left/right controls during print.
- Show print preview only during print.
- Set page orientation classes:
  - letter landscape: 11in x 8.5in.
  - tabloid landscape: 17in x 11in.
- Ensure disclaimer/title block prints.

Use:

```css
@media print {
  @page { size: landscape; margin: 0.35in; }
}
```

Add class-based sizing inside the print layout.

### 6. Add export CTA

Topbar button should become:

- “Preview / Export PDF”

In preview mode:

- “Print or Save PDF”
- “Close preview”

## Acceptance criteria

- Export does not print side panels.
- Output includes title, address, APN, date, prepared by, notes, disclaimer, north arrow, and scale note.
- User can choose letter or 11x17 landscape.
- Export still works without server infrastructure.

## Non-goals

- Do not add server-side PDF rendering yet.
- Do not add e-signatures, stamps, or surveyor seals.
- Do not claim the output is survey-grade.
