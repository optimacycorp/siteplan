# Codex Patch 06 - QA Beta Release

## Intent

Prepare QuickSite for a small external beta test without adding advanced portal features.

## Files to modify

- `README.md`
- `docs/deployment-racknerd.md`
- `docs/open-parcel-migration.md`
- `src/components/AppShell.tsx`
- `src/components/DevStatusPanel.tsx`
- `src/styles.css`

## Add files

- `docs/QA_CHECKLIST.md`
- `docs/BETA_TEST_SCRIPT.md`
- `docs/KNOWN_LIMITATIONS.md`
- `src/fixtures/exampleProject.ts`
- `src/utils/errorLog.ts`

## Implementation steps

### 1. Add QA checklist

Create `docs/QA_CHECKLIST.md` with test cases:

1. Fresh load.
2. Fixture mode load.
3. Search known address.
4. Select parcel from result.
5. Click parcel on map.
6. Toggle basemap.
7. Toggle layers.
8. Draw structure polygon.
9. Draw driveway line.
10. Draw dimension line.
11. Add label.
12. Rename drawing.
13. Delete drawing.
14. Refresh and confirm local persistence.
15. Clear draft.
16. Print preview letter landscape.
17. Print preview 11x17 landscape.
18. Parcel provider failure state.
19. Geocoder no-result state.
20. Mobile/tablet smoke check.

### 2. Add beta tester script

Create `docs/BETA_TEST_SCRIPT.md` with plain-language tasks:

- “Find this property.”
- “Draw a proposed garage.”
- “Add a driveway.”
- “Add a label.”
- “Export a PDF.”
- “Tell us where you got stuck.”

### 3. Add known limitations

Create `docs/KNOWN_LIMITATIONS.md` with clear disclaimers:

- Parcel data approximate.
- Measurements approximate.
- Not a survey.
- Not a permit approval.
- Some addresses may require clicking parcel manually.
- Open parcel coverage initially focused on selected Colorado Springs/El Paso County target areas.

### 4. Add frontend error log helper

Create `src/utils/errorLog.ts`:

- `logAppError(context, error)`
- In dev, console.error with context.
- In production, console.warn or no-op for now.

Use it in:

- Address search catch blocks.
- Parcel selection catch blocks.
- Export catch blocks.

### 5. Add example project fixture

Create `src/fixtures/exampleProject.ts` that can seed:

- One parcel.
- One structure polygon.
- One driveway line.
- One label.

Add dev-only button: “Load example.”

### 6. Release checklist

Update README with:

```bash
corepack enable
pnpm install
pnpm check:env
pnpm build
pnpm test
```

Add deployment verification:

- App loads over HTTPS.
- Proxy health endpoint responds.
- Fixture mode off in production.
- Regrid fallback setting documented.
- PDF export tested in Chrome and Edge.

## Acceptance criteria

- Beta tester can follow the script without developer help.
- Known limitations are visible in docs and not hidden.
- Build/deploy checklist is complete.
- Example project can be loaded in dev mode.
- No advanced Land Portal modules leak into the UI.

## Non-goals

- No accounts.
- No billing.
- No AI assistant.
- No title commitment workflow.
- No surveyor certification/stamp language.
