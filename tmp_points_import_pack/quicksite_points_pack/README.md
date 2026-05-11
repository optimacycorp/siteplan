# Optimacy QuickSite — Points Import Sprint Pack

This pack evaluates the current WIP and proposes a practical path for importing GPS / total-station points into the MVP.

Recommended direction: start with a **local coordinate import system** tied to one map anchor / control point and a rotation. Do not jump directly to full State Plane until the UI and validation rules are stable.

Contents:

- `docs/01_progress_assessment.md` — current WIP assessment
- `docs/02_accuracy_and_reliability.md` — honest accuracy guidance
- `docs/03_points_import_architecture.md` — data model and workflow
- `docs/04_state_plane_future_plan.md` — how to introduce State Plane later
- `codex/01_sprint_local_points_import.md` — Codex patch prompt for local import
- `codex/02_sprint_point_layer_labels.md` — Codex patch prompt for map labels and feature list
- `codex/03_sprint_control_transform_validation.md` — Codex patch prompt for transform QA
- `codex/04_sprint_state_plane_foundation.md` — Codex patch prompt for CRS foundation without overbuilding
- `patches/quicksite-points-import-codex.patch.md` — consolidated patch-style instructions
- `qa/points_import_qa_checklist.md` — acceptance checklist
- `samples/sample_local_points.csv` — test CSV
