# New Repository Setup Plan

## Recommended repository name

Use one of:

- `optimacy-quicksite`
- `optimacy-siteplan-mvp`
- `optimacy-site-plan-creator`

I recommend `optimacy-quicksite` because it keeps the scope broad enough for site plans, zoning sketches, and planning exhibits.

## Option A - clean new repo, copy selected code

This is the recommended route.

```bash
mkdir optimacy-quicksite
cd optimacy-quicksite
git init
pnpm create vite . --template react-ts
pnpm install
pnpm add maplibre-gl zustand @tanstack/react-query clsx zod
pnpm add -D vitest typescript
```

Then apply the Codex patches in this pack.

## Option B - fork/copy current repo, delete heavy modules

Use this only if you want to preserve a lot of app wiring quickly.

```bash
git clone <existing-landportal-repo-url> optimacy-quicksite
cd optimacy-quicksite
rm -rf .git
git init
```

Then delete or quarantine:

- title/document modules
- advanced project workflow
- subdivision/yield modules
- admin screens
- old Supabase migrations
- deployment scripts unrelated to the MVP

Option B is faster for local experiments but more likely to carry complexity forward.

## Recommended branching

```bash
git checkout -b sprint-0-bootstrap
```

After Sprint 0 is stable:

```bash
git add .
git commit -m "Bootstrap QuickSite MVP shell"
git checkout -b sprint-1-address-parcel-map
```

## Initial environment variables

Create `.env.local`:

```bash
VITE_REGRID_PROXY_BASE_URL=http://localhost:8787/regrid/
VITE_DEFAULT_CENTER_LNG=-104.871
VITE_DEFAULT_CENTER_LAT=38.930
VITE_DEFAULT_ZOOM=16
```

Do not put raw Regrid API keys in the frontend. Keep Regrid behind a proxy.

## GitHub creation

Using GitHub CLI:

```bash
gh repo create optimacy-quicksite --private --source=. --remote=origin --push
```

Manual GitHub option:

1. Create an empty private repo in GitHub.
2. Copy the remote URL.
3. Run:

```bash
git remote add origin <repo-url>
git branch -M main
git push -u origin main
```

## MVP principle

This repo should not know about title commitments, survey review, admin membership, or subdivision yield until the simple site-plan flow works end-to-end.
