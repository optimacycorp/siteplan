# Optimacy QuickSite

A lightweight address-to-site-plan MVP focused on:

- searching for a property by address
- selecting a parcel and visualizing its boundary
- sketching a simple conceptual planning exhibit
- exporting through the browser print flow

## Setup

1. Install dependencies with `pnpm install`
2. Copy `.env.example` to `.env`
3. Start the app with `pnpm dev`

## Environment

The app expects a server-side Regrid proxy:

```env
VITE_REGRID_PROXY_BASE_URL=http://localhost:8787/regrid/
VITE_DEFAULT_CENTER_LNG=-104.871
VITE_DEFAULT_CENTER_LAT=38.930
VITE_DEFAULT_ZOOM=16
```

Do not expose Regrid credentials in browser code.

## Sprint Status

- Sprint 0: bootstrap shell and MapLibre foundation
- Sprint 1: address search, parcel selection, parcel summary, adjoining parcel layer
- Sprint 2: local drawing draft persistence and basic exhibit tools in progress

## Deployment

RackNerd/Nginx deployment assets live in:

- [docs/deployment-racknerd.md](C:\Users\Costandine_T\Downloads\siteplan\docs\deployment-racknerd.md)
- [deploy/nginx/siteplan.gomil.com.conf](C:\Users\Costandine_T\Downloads\siteplan\deploy\nginx\siteplan.gomil.com.conf)
- [deploy/certbot/issue-siteplan-cert.sh](C:\Users\Costandine_T\Downloads\siteplan\deploy\certbot\issue-siteplan-cert.sh)
