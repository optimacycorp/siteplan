# Patch Strategy

## Goal
Provide a narrow, Codex-ready patch plan that fixes the current UI/data issues without forcing a redesign.

## Immediate fixes

### Fix A — Supporting record stack still shows old documents after delete
This happens because the supporting record stack is built from the entire project document list rather than from records still meaningfully attached to the active title workflow.

### Fix B — Child title-chain tiles show synthetic fallback titles
This happens because the parser/import flow is allowing a synthetic fallback title such as:
- `El Paso county recorded linked document 1`

to win even when a visible chain line exists in the PDF.

## Patch philosophy
- keep changes narrow
- preserve existing feature flow
- do not rename public hooks unless necessary
- do not redesign the whole title workspace
- prefer deterministic display-title precedence
