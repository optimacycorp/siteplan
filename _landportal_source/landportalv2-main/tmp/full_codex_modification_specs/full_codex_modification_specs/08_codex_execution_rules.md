# Codex Execution Rules

## General
- make the minimum necessary changes
- preserve existing exports and component contracts unless task explicitly says otherwise
- do not redesign the whole app in one pass
- do not swap out MapLibre
- do not disturb working title workflow while patching parcel/map behavior

## Title rules
- visible chain text is authoritative for display
- synthetic fallback remains only as the final fallback
- metadata fallback should be used when first-class fields are blank

## Spatial rules
- one active parcel anchor per project
- selected parcel is the primary visual feature
- adjoining parcels are context only
- fit-to-parcel should not run on every render

## Performance rules
- use bbox-limited adjoining parcel fetch
- keep adjoining parcel labels off by default
- avoid rendering unnecessary overlays by default
