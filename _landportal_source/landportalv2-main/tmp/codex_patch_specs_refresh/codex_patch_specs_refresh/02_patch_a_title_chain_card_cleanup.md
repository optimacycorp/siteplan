# Patch A — Title-Chain Card Cleanup

## Goal
Make each child title-chain card show a clean friendly title and a shortened reference display without exposing raw URL/token text.

## Required behavior

### Title precedence
Use this precedence for the card title:
1. matched visible chain text
2. `sourceReferenceText`
3. existing stored document title if not synthetic and not a raw signed token
4. human-readable URL-derived label
5. synthetic fallback only as final fallback

### Reference display
- show the friendly reference text in the card
- if the reference is longer than 40 characters, truncate to 40 chars with ellipsis
- expose full text via tooltip/title on hover

### Anti-rules
- do not use signed URL/token strings as visible title
- do not use `linked document N` when visible chain text exists
- do not blank the title if truncation helper fails

## Patch requirements
Implement a helper such as:
- `getFriendlyChainTitle(...)`
- `truncateReference(value: string, max = 40): string`
- `looksLikeSignedTokenOrUrl(value: string): boolean`

## Acceptance criteria
- card header shows friendly title, not raw token text
- long reference is truncated in UI but full string is visible on hover
- visible sample uses the `El Paso county recorded ...` style title
