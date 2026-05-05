# Codex Patch 07 — Setback/Zoning Constraint Layer

Objective: Simple rules-based constraints.

Tasks:
1. Add `src/domain/constraints/rulesSchema.ts`.
2. Define JSON ruleset for jurisdiction, zone, setbacks, notes, source URL/text.
3. Add manual jurisdiction/zone selector.
4. Render interior setback offsets/buildable area.
5. Support frontage edge selection if already present.
6. Add disclaimer: rules must be verified with jurisdiction.

Acceptance:
- Ruleset selection works.
- Setback layer renders.
- Frontage assumption is visible.
- Export includes assumptions and notes.
