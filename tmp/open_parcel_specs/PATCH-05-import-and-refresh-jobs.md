# PATCH-05 — Incremental Import / Refresh Jobs

## Goal
Load only what you need first, then backfill.

## MVP refresh strategy

- On lookup miss: query county ArcGIS by point and cache the feature.
- Nightly: refresh project counties only.
- Weekly/monthly: refresh broad county layers if needed.
- Do not try to load the entire United States.

## Tables to add

```sql
create table if not exists public.parcel_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  status text not null check (status in ('running','succeeded','failed')),
  mode text not null check (mode in ('dry_run','on_demand','scheduled','manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched_count integer default 0,
  upserted_count integer default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);
```

## Commands

```bash
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --bbox -105.05,38.80,-104.75,39.00
node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --changed-since 2026-04-01
```

## Cron suggestion

```cron
15 3 * * 0 cd /home/deploy/apps/siteplan && node scripts/parcel-loaders/load-el-paso-county-parcels.mjs --changed-since "$(date -u -d '45 days ago' +\%F)"
```
