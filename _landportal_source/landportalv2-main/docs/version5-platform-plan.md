# Version 5 platform plan

## Product reset

Land Portal V2 is now positioned as a land development intelligence platform.
Survey remains in the product, but moves under Advanced so the default experience is understandable to developers, acquisition teams, and builders.

## New top-level experience

- Dashboard
- Projects
- Parcel
- Yield Analyzer
- Subdivision Designer
- Site Planner
- Documents
- Advanced Survey
- Settings
- Team
- Billing

## Workspace personas

Supported workspace modes:

- developer
- acquisition
- builder
- surveyor

Recommended defaults:

- acquisition -> Yield Analyzer
- developer -> Subdivision Designer
- builder -> Site Planner
- surveyor -> Advanced Survey

## Keep these existing tables

- profiles
- workspaces
- workspace_members
- projects
- project_members
- project_map_settings
- survey_points
- survey_segments

## Extend existing tables

### workspaces

Add `workspace_mode` to drive the default landing route and language.

### projects

Add product-facing fields such as `project_type`, `project_stage`, `parcel_status`, and a `summary` JSON payload for dashboard cards.

### project_map_settings

Extend with `visible_layers`, `map_theme`, and `print_layout` so the same map backbone can support parcel, subdivision, and site-planning views.

## New schema areas

### Parcel

- `parcel_snapshots`
- `parcel_geometries`
- `parcel_constraints`

### Yield

- `yield_scenarios`
- `yield_comparisons`

### Subdivision

- `subdivision_rulesets`
- `subdivision_layouts`
- `subdivision_lots`

### Site planner

- `site_plan_layouts`
- `site_plan_elements`

### Documents

- `project_documents`
- `export_jobs`

### Advanced survey settings

- `coordinate_system_presets`
- `ntrip_profiles`
- `code_libraries`

## Package architecture

Keep:

- `@landportal/auth`
- `@landportal/api-client`
- `@landportal/config`
- `@landportal/ui`
- `@landportal/map-core`
- `@landportal/core-geometry`
- `@landportal/core-survey`

Add:

- `@landportal/core-parcel`
- `@landportal/core-yield`
- `@landportal/core-subdivision`
- `@landportal/core-siteplanner`
- `@landportal/core-documents`

## Subdivision engine architecture

### Inputs

- parcel geometry
- exclusions and setbacks
- zoning and rulesets
- road access assumptions
- target units or open-space goals

### Layers

1. Parcel normalization
2. Rules normalization
3. Layout strategy selection
4. Validation
5. Metrics and warnings

### Early strategies

- grid subdivision
- frontage split
- block and road

## Site planner architecture

### Inputs

- buildable parcel envelope
- subdivision layout or parcel outline
- roads, utilities, easements, trees, and right-of-way
- building footprint assumptions

### Layers

1. Layout placement
2. Constraint filtering
3. Symbol styling
4. Print composition

## UI wireframe pattern

Use a consistent shell across Parcel, Yield, Subdivision Designer, and Site Planner:

- left rail: layers, scenarios, or object list
- center: map or plan canvas
- right rail: inspector, metrics, or rules
- bottom tray: warnings, exports, or comparisons when needed

## Sprint sequence

### Sprint A

Navigation reset and persona-based workspace behavior.

### Sprint B

Parcel tables, parcel geometry, parcel inspector, and map-linked parcel selection.

### Sprint C

Yield scenarios, live assumptions, persistence, and comparison workflow.

### Sprint D

Subdivision rulesets, layout generation, metrics, validation, and saved concepts.

### Sprint E

Site planner layers, symbol library, print scene composition, and PDF-ready outputs.

### Sprint F

Documents, export jobs, demo datasets, polish, and pitch-ready packaging.
