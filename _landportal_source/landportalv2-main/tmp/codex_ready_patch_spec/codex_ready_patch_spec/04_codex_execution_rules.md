# Codex Execution Rules

Use these rules when applying the patch.

## General
- Make only the minimum necessary edits.
- Preserve existing exports unless the task explicitly says otherwise.
- Do not rename hooks, components, or files unless the task explicitly says otherwise.
- Do not redesign the parser architecture.
- Do not move remote fetch logic unless the task explicitly says otherwise.

## Parser rules
- Prefer visible chain text over synthetic fallback text.
- Do not remove current fallback behavior entirely; only demote it to the final fallback.
- Do not fetch remote files inside the parser.

## UI rules
- Do not remove preview functionality.
- Do not remove retry/unlink actions.
- Do not change current modal behavior unless necessary for type safety.

## Data rules
- Keep underlying project documents unless the user explicitly deletes them.
- For this patch, fix visibility/filtering before changing document ownership semantics.

## Testing rules
- Add or update tests if test coverage exists nearby.
- If no test file exists, add a small targeted test or at minimum leave deterministic code paths suitable for testing.
