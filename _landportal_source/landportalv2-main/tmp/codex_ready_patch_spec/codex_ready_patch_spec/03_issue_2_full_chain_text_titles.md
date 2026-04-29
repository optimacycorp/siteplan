# Issue 2 — Full Visible Chain Text Should Be Used As Child Titles

## Problem
Child title-chain records are displaying synthetic titles like:
- `El Paso county recorded linked document 1`

instead of the full visible chain line such as:
- `El Paso county recorded 02/27/2020 under reception no. 220028404`

## Root cause
The parser/import flow is falling back to synthetic titles too early.

## Required title precedence
When creating or displaying a child title-chain record, use this precedence:

1. matched visible chain line from the PDF
2. stored `sourceReferenceText`
3. existing stored document title, if it is not synthetic
4. decoded human-readable URL-derived label
5. synthetic fallback like `linked document N` only if no better text exists

## Required patch
In the parser/import flow, make the visible chain line authoritative whenever available.

### Explicit rule
If a visible chain entry exists on the same page and is matched with acceptable confidence, its full text must become:
- `referenceText`
- default child document title
- tile display title

### Explicit anti-rule
Do not generate or keep `linked document N` when a visible chain line exists.

## Acceptance criteria
For the sample title package, a child tile should display:
- `El Paso county recorded 02/27/2020 under reception no. 220028404`

and not:
- `El Paso county recorded linked document 1`
