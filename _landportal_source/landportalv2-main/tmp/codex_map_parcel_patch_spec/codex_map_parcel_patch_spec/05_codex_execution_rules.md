# Codex Execution Rules

## General
- make the minimum necessary changes
- preserve existing exports and component contracts unless task explicitly says otherwise
- do not redesign the whole application shell in one pass
- do not swap out the map library
- do not change title workflow behavior in this patch set

## Spatial rules
- prefer existing parcel selection state if present
- compute and store bbox deterministically
- use selected parcel as the primary map focus
- adjoining parcels must be rendered as context, not as the primary active feature

## UI rules
- preserve existing design tools where possible
- do not remove current designer controls
- keep the selected parcel visually dominant

## Performance rules
- do not request unbounded parcel neighborhoods
- use bbox-limited adjacent parcel fetch
- keep labels on adjoining parcels off by default
