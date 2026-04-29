# Codex Execution Rules

## General
- make the minimum necessary changes
- preserve existing exports unless task explicitly says otherwise
- do not redesign the whole title workspace
- do not rename public hooks/components unless necessary
- do not move major logic across modules unless required by the patch

## UI rules
- preserve preview functionality
- preserve retry/unlink actions
- use small helpers for title/reference cleanup rather than large rewrites

## Data rules
- prefer first-class commitment fields, then metadata fallback
- do not wipe out existing metadata
- do not use raw signed URLs as human-facing display values

## Parser/title rules
- visible chain text is authoritative for display
- synthetic fallback remains only as final fallback
- signed-token detection should be conservative and deterministic

## CSS rules
- keep styles local to the title module when possible
- do not change unrelated layout styles
