# Current Issues

## Issue 1 — Title-chain cards are showing the wrong visible title
Current bad state:
- raw signed URL/token fragments are appearing as the card header
- fallback text such as `El Paso county recorded linked docume...` is showing instead of the full friendly reference
- the visible friendly chain line is not being used consistently

Desired state:
- card title uses the friendly visible chain text, for example:
  `El Paso county recorded 02/27/2020 under reception no. 220028404`
- if the string exceeds 40 characters in the compact card header, shorten with ellipsis
- on hover, the full friendly text is available via tooltip/title
- raw URL/token text should never be used as the card title

## Issue 2 — Commitment stack fields are blank
Current bad state:
- Status
- Import Status
- Order Number
- Schedule / account
- Date of issue
- Effective date
- Property address
- Issuing company
are blank or showing “Not extracted” even though parsing logic exists

Likely causes:
- parsed fields are not being persisted correctly
- parsed fields are being persisted into metadata but not mapped back into the commitment view
- the workspace query may not be returning the fields
- field precedence in the UI may be wrong

Desired state:
- parsed/overridden values appear consistently in the commitment stack card
- if a field is missing, use deterministic fallback text, but do not blank out fields that exist in metadata

## Issue 3 — Preview overlay is messy
Current bad state:
- overlay sizing/layering is off
- preview area obscures workspace awkwardly
- scroll or click behavior is not clean

Desired state:
- popup overlay is centered, scroll-contained, and layered correctly
- clicking backdrop closes
- clicking inside the card does not close
- iframe/image preview is sized predictably
