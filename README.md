# Optimacy QuickSite

A lightweight address-to-site-plan MVP focused on:

- searching for a property by address
- selecting a parcel and visualizing its boundary
- sketching a simple conceptual planning exhibit
- exporting through the browser print flow

## Quick start

Recommended fresh-clone path:

1. `corepack enable`
2. `pnpm install`
3. `pnpm check:env`
4. Copy `.env.example` to `.env`
5. `pnpm dev`

Build verification:

```bash
pnpm build
pnpm test
```

## Fixture mode

QuickSite can run without live parcel credentials by using fixture mode:

```bash
VITE_USE_PARCEL_FIXTURES=true pnpm dev
```

This loads a local Rampart parcel fixture so UI work can continue even when the parcel proxy is offline.

## Environment

Typical local values:

```env
VITE_USE_PARCEL_FIXTURES=false
VITE_REGRID_PROXY_BASE_URL=/regrid/
VITE_DEFAULT_CENTER_LNG=-104.897322
VITE_DEFAULT_CENTER_LAT=38.878370
VITE_DEFAULT_ZOOM=17
```

Do not expose provider or Supabase secrets in browser code.

## Sprint Status

- Sprint 0: bootstrap shell and MapLibre foundation
- Sprint 1: address search, parcel selection, parcel summary, adjoining parcel layer
- Sprint 2: local drawing draft persistence and basic exhibit tools in progress

## Deployment

RackNerd/Nginx deployment assets live in:

- [docs/deployment-racknerd.md](C:\Users\Costandine_T\Downloads\siteplan\docs\deployment-racknerd.md)
- [deploy/nginx/siteplan.gomil.com.conf](C:\Users\Costandine_T\Downloads\siteplan\deploy\nginx\siteplan.gomil.com.conf)
- [deploy/certbot/issue-siteplan-cert.sh](C:\Users\Costandine_T\Downloads\siteplan\deploy\certbot\issue-siteplan-cert.sh)

The parcel search flow uses the local open parcel proxy in [server/openParcelProxy.mjs](C:\Users\Costandine_T\Downloads\siteplan\server\openParcelProxy.mjs), with [server/regridProxy.mjs](C:\Users\Costandine_T\Downloads\siteplan\server\regridProxy.mjs) retained as the compatibility entrypoint for the existing systemd service name.
