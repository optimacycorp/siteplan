# Codex Patch 01 — Provider Registry + Fulton County Parcel Provider

Objective: Refactor parcel lookup into a provider registry and add Fulton County, GA.

Tasks:
1. Search current parcel lookup, Regrid calls, Supabase parcel calls, and address-search logic.
2. Add `src/data/providers/parcels/types.ts`, `providerRegistry.ts`, `fultonCountyProvider.ts`.
3. Wrap existing provider behavior; do not remove it.
4. Route address results through: geocode → provider selection → parcel query.
5. Add parcel summary source line.
6. Add user-readable errors for geocode failure, no parcel, provider unavailable, malformed geometry.

Acceptance:
- Existing lookup still works.
- Fulton provider can be selected or auto-selected.
- Parcel summary shows data source.
- Errors are clear.
