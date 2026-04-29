# Patch C — Preview Overlay Cleanup

## Goal
Clean up the popup preview overlay so it behaves like a proper modal.

## Required behavior
- overlay/backdrop covers viewport cleanly
- modal card is centered and scroll-contained
- clicking backdrop closes
- clicking inside modal does not close
- modal content does not overflow outside viewport
- iframe/image preview sizes correctly

## Patch requirements
- inspect modal CSS in `ProjectTitlePage.module.css` or equivalent
- fix z-index, max-height, max-width, overflow behavior
- ensure the preview card uses a predictable layout
- keep current preview behavior for PDF and image

## Acceptance criteria
- preview overlay does not distort page layout
- iframe preview is readable and contained
- image preview scales correctly
- backdrop click closes, modal click does not
