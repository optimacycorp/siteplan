# Supabase Keepalive

This repo includes a RackNerd-friendly Supabase exerciser that performs both safe reads and safe writes against the live parcel schema so the project stays active.

## Files

- `scripts/ops/supabase-keepalive.mjs`
- `scripts/ops/run-supabase-keepalive.sh`

## What it does

The script uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to perform:

- `SELECT` activity against:
  - `parcel_sources`
  - `parcels`
  - `parcel_import_runs`
- safe `INSERT` + `UPDATE` activity against:
  - `parcel_import_runs`
- optional cleanup of old keepalive rows from:
  - `parcel_import_runs`
- RPC activity against:
  - `search_open_parcels_text`
  - `search_open_parcel_by_identifier`
  - `lookup_parcel_by_point`
  - `get_open_parcel_detail`
  - `lookup_open_parcel_neighbors`

It tags its write rows with:

```json
{
  "activity_type": "keepalive",
  "origin": "siteplan-supabase-keepalive"
}
```

so the writes stay easy to identify and clean up.

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
OPEN_PARCEL_KEEPALIVE_RETENTION_DAYS=14
OPEN_PARCEL_KEEPALIVE_JITTER_SECONDS_MAX=600
```

You can also give the script multiple seeds and let it choose one at random each run:

```bash
OPEN_PARCEL_KEEPALIVE_SEEDS_JSON='[
  {"name":"el-paso","queryText":"733320000","identifier":"7333200002","lng":-104.897322,"lat":38.878370},
  {"name":"maricopa","queryText":"1220 S Central Ave Phoenix AZ 85003","identifier":"11224162A","lng":-112.074676,"lat":33.436300},
  {"name":"pueblo","queryText":"1 City Hall Place Pueblo CO 81003","identifier":"000000000","lng":-104.609141,"lat":38.265425}
]'
```

The script will choose one seed per run and vary the query limit a bit so the request shape is not perfectly identical every time.

## Cron example

For your case, run it every hour from 9:00 AM through 6:00 PM server time:

```bash
0 9-18 * * * cd /home/deploy/apps/siteplan && /usr/bin/bash scripts/ops/run-supabase-keepalive.sh >> /home/deploy/siteplan-supabase-keepalive.log 2>&1
```

Recommended RackNerd env additions in `/etc/siteplan-regrid-proxy.env`:

```bash
OPEN_PARCEL_KEEPALIVE_JITTER_SECONDS_MAX=600
OPEN_PARCEL_KEEPALIVE_RETENTION_DAYS=14
```

## Manual test

You can also run the Node script directly if the Supabase env vars are already exported:

```bash
cd ~/apps/siteplan
pnpm supabase:keepalive
```

## If Supabase still warns about inactivity

If these reads and writes still do not satisfy the inactivity detector, the next likely fixes are:

1. add a tiny authenticated dashboard or admin ping that exercises Auth as well
2. add a small Storage list/read if your project has a bucket
3. call one Edge Function on the same hourly schedule
4. ask Supabase support what activity classes count for the pause detector on your plan
5. upgrade to Pro if the project needs guaranteed always-on behavior
