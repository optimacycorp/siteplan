# Codex Patch 04 — Persistent Interactive Labels

Objective: Durable labels for bearings, distances, acreage, and notes.

Tasks:
1. Add label model.
2. Store labels in existing local persistence; optional Supabase sync if already stable.
3. Auto-label polygon acreage, line distance, and line bearing.
4. Add manual note label create/edit/move/delete.
5. Prevent duplicate regenerated labels after refresh.
6. Include labels in export.

Acceptance:
- Labels survive refresh.
- Measurement labels update with geometry edits.
- Labels appear in export.
