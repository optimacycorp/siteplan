# Optimacy QuickSite

A lightweight parcel-to-site-plan MVP for:

- finding a property
- confirming the parcel boundary
- sketching a conceptual plan
- exporting a conceptual exhibit sheet

## Run locally with fixtures

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Fixture mode does not require API keys. It loads the Rampart sample parcel so the full workflow can be exercised on a fresh clone.

## Build verification

```bash
pnpm lint
pnpm test
pnpm build
```

## Environment

The client prefers the parcel proxy variables:

```env
VITE_PARCEL_PROXY_BASE_URL=/parcels/
VITE_REGRID_PROXY_BASE_URL=/parcels/ # legacy compatibility only
```

Use `VITE_USE_PARCEL_FIXTURES=true` for local UI work without live parcel services.

Do not expose provider or Supabase secrets in browser code.

## Deployment

RackNerd and Nginx deployment assets live in:

- [C:\Users\Costandine_T\Downloads\siteplan\docs\deployment-racknerd.md](C:\Users\Costandine_T\Downloads\siteplan\docs\deployment-racknerd.md)
- [C:\Users\Costandine_T\Downloads\siteplan\deploy\nginx\siteplan.gomil.com.conf](C:\Users\Costandine_T\Downloads\siteplan\deploy\nginx\siteplan.gomil.com.conf)
- [C:\Users\Costandine_T\Downloads\siteplan\deploy\certbot\issue-siteplan-cert.sh](C:\Users\Costandine_T\Downloads\siteplan\deploy\certbot\issue-siteplan-cert.sh)

The active parcel proxy implementation lives in [C:\Users\Costandine_T\Downloads\siteplan\server\openParcelProxy.mjs](C:\Users\Costandine_T\Downloads\siteplan\server\openParcelProxy.mjs), with the compatibility entrypoint retained in [C:\Users\Costandine_T\Downloads\siteplan\server\regridProxy.mjs](C:\Users\Costandine_T\Downloads\siteplan\server\regridProxy.mjs).

## Repo hygiene

Reference packs and archived source material should stay outside the active app flow when possible. See [C:\Users\Costandine_T\Downloads\siteplan\docs\reference-material.md](C:\Users\Costandine_T\Downloads\siteplan\docs\reference-material.md).
