# Land Portal

Land Portal is a land development intelligence platform centered on property, yield, subdivision design, site planning, and reports, with advanced survey tools available separately for power users.

## Platform foundation

The current platform standardizes the app around:

- Supabase Auth for sign-in, session restore, and password recovery
- Supabase Postgres for workspaces, profiles, memberships, and projects
- a Vite + React + TypeScript web app served as static assets
- shared packages for auth, API access, parcel intelligence, geometry utilities, survey math, yield analysis, subdivision design, and site planning
- a pnpm workspace + Turborepo monorepo structure

## Apps and packages

- `apps/web`: main browser application
- `packages/auth`: Supabase auth helpers and auth error formatting
- `packages/api-client`: shared Postgres project access helpers
- `packages/core-parcel`: parcel processing, intelligence scoring, and frontage analysis
- `packages/core-yield`: business-facing yield calculations
- `packages/core-subdivision`: layout generation and concept metrics
- `packages/core-siteplanner`: site-planning symbols, transforms, and summaries
- `packages/core-survey`: traverse math and CSV export helpers
- `packages/core-geometry`: shared geometry utilities

## Environment

The frontend is configured for this Supabase project:

```bash
VITE_SUPABASE_URL=https://gnvdiklymbsbtcdbrybj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_zBfeg_kByIBQbn0qB54u9w_TEHavXxx
```

The root `.env` file is reserved for server-only Supabase values such as:

```bash
SUPABASE_URL=https://gnvdiklymbsbtcdbrybj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
REGRID_API_TOKEN=...
REGRID_PARCEL_API_BASE=https://app.regrid.com
REGRID_TILE_API_BASE=https://tiles.regrid.com
```

## Remaining Supabase setup

You still need to finish these steps in Supabase before login and project access will work:

- set your active deployment URL as the Supabase Auth site URL
- add redirect URLs for:
  - `/auth/update-password`
  - `/auth/reset-password`
- run `scripts/seed-supabase-admins.mjs` or `scripts/seed-supabase-admins.sh`

The database connection string and database password are not used by the frontend. They are only needed later for direct database tooling or server-side integrations.

## Install and build

```bash
pnpm install
pnpm --filter @landportal/web build
```

## Deployment

See `ops/DEPLOYMENT.md` for the RackNerd/nginx deployment steps.
