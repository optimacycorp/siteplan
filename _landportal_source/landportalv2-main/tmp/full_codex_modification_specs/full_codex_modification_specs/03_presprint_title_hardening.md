# Pre-Sprint — Title Hardening

## Goal
Stabilize the title workspace before deeper spatial work depends on it.

## Patch tasks
1. Use friendly visible chain text for child tile titles.
2. Truncate long references to 40 chars with ellipsis and full hover text.
3. Restore commitment stack fields using deterministic precedence:
   - first-class field
   - metadata fallback
   - final fallback text
4. Fix supporting stack filtering after delete/unlink.
5. Clean up preview overlay behavior.
6. Keep retry/unlink and query invalidation stable.

## Acceptance
- no raw signed token text appears as visible card title
- commitment fields are populated when parsed values exist
- no stale title-linked docs remain in the supporting stack
- preview modal is readable and contained
