# Reference Material

This MVP repo should stay focused on the active QuickSite app.

Reference packs, exploratory source zips, archived Codex notes, and other large comparison material should live outside the main working tree whenever possible.

Recommended locations:

- sibling folders next to the repo
- a dedicated local `archives/` folder that is excluded from git
- external notes/docs storage

Current examples of reference-only material:

- `_landportal_source/`
- `_quicksite_pack/`
- temporary Codex zip extractions such as `tmp_wip_eval_pack/`

Keep these out of the active app flow so:

- the repo root stays easy to scan
- Codex patches stay targeted
- production work is less likely to accidentally depend on archived files
