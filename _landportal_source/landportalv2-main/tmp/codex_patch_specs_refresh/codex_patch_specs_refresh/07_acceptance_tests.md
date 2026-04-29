# Acceptance Tests

## Test 1 — Friendly card title
Given:
- a child chain tile has visible chain text
Then:
- the card title uses that friendly text
- the card title is not a raw signed token string

## Test 2 — Truncated reference with hover
Given:
- a friendly reference longer than 40 characters
Then:
- visible text is truncated with ellipsis
- full text is available via tooltip/title

## Test 3 — Commitment fields render
Given:
- commitment has extracted data in first-class fields or metadata
Then:
- the stack card shows non-blank values for order/date/address/company where available

## Test 4 — Preview overlay cleanup
Given:
- preview modal is opened
Then:
- modal is centered and scroll-contained
- backdrop click closes
- modal click does not close
- iframe/image is readable and contained
