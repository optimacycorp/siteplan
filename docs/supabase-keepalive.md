# Supabase Keepalive

This repo includes a RackNerd-friendly keepalive script that exercises the live Supabase parcel tables and RPC functions so the project stays active.

## Files

- `scripts/ops/supabase-keepalive.mjs`
- `scripts/ops/run-supabase-keepalive.sh`

## What it checks

The script uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to run a safe read-only keepalive against:

- `parcel_sources`
- `parcels`
- `parcel_import_runs`
- `rpc.search_open_parcels_text`
- `rpc.search_open_parcel_by_identifier`
- `rpc.lookup_parcel_by_point`
- `rpc.get_open_parcel_detail`
- `rpc.lookup_open_parcel_neighbors`

It exits with a non-zero code if any required check fails.

## RackNerd usage

From the project directory:

```bash
cd ~/apps/siteplan
bash scripts/ops/run-supabase-keepalive.sh
```

That wrapper automatically loads:

```bash
/etc/siteplan-regrid-proxy.env
```

unless you override `ENV_FILE`.

## Optional environment overrides

These are optional and can be added to `/etc/siteplan-regrid-proxy.env` if you want different keepalive targets:

```bash
OPEN_PARCEL_KEEPALIVE_QUERY_TEXT=733320000
OPEN_PARCEL_KEEPALIVE_IDENTIFIER=7333200002
OPEN_PARCEL_KEEPALIVE_LNG=-104.897322
OPEN_PARCEL_KEEPALIVE_LAT=38.878370
OPEN_PARCEL_KEEPALIVE_TIMEOUT_MS=20000
```

The point and identifier defaults are chosen from the known working El Paso dataset.

## Cron example

Run it once a week:

```bash
17 3 * * 1 cd /home/deploy/apps/siteplan && /usr/bin/bash scripts/ops/run-supabase-keepalive.sh >> /home/deploy/siteplan-supabase-keepalive.log 2>&1
```

Run it twice a week:

```bash
17 3 * * 1,4 cd /home/deploy/apps/siteplan && /usr/bin/bash scripts/ops/run-supabase-keepalive.sh >> /home/deploy/siteplan-supabase-keepalive.log 2>&1
```

## Manual test

You can also run the Node script directly if the Supabase env vars are already exported:

```bash
cd ~/apps/siteplan
pnpm supabase:keepalive
```
