begin;

drop policy if exists "parcel_snapshots_delete_admin_editor" on public.parcel_snapshots;
create policy "parcel_snapshots_delete_admin_editor"
on public.parcel_snapshots
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = parcel_snapshots.project_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
);

drop policy if exists "project parcel selections delete by workspace editors" on public.project_parcel_selection;
create policy "project parcel selections delete by workspace editors"
on public.project_parcel_selection
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_parcel_selection.project_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'editor')
  )
);

commit;
