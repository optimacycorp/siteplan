# Codex Patch 00 - Bootstrap Separate QuickSite Repository

## Intent

Create a new separate MVP repository named `optimacy-quicksite`. Do not integrate this into the existing Land Portal repo.

## Instructions for Codex

Apply this to a fresh Vite React TypeScript project.

### Commands

```bash
pnpm create vite . --template react-ts
pnpm add maplibre-gl zustand @tanstack/react-query clsx zod
pnpm add -D vitest
```

### Add files

Copy the contents of `scaffold/` from this pack into the new repository root.

### Remove starter files

Replace the default Vite `src/App.tsx`, `src/main.tsx`, and `src/index.css` with the scaffold versions.

### Acceptance criteria

- `pnpm dev` starts without TypeScript errors.
- App displays a three-pane shell.
- Map placeholder is wired for MapLibre integration.
- No Supabase dependencies exist.
- No document/title/subdivision modules exist.
