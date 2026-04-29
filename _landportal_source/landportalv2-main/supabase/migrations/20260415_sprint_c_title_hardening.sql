begin;

alter table public.title_commitments
  add column if not exists is_primary boolean not null default false;

create index if not exists idx_title_commitments_project_primary
  on public.title_commitments(project_id, is_primary);

with ranked_commitments as (
  select
    id,
    row_number() over (
      partition by project_id
      order by is_primary desc, updated_at desc, created_at asc
    ) as row_num
  from public.title_commitments
)
update public.title_commitments tc
set is_primary = ranked_commitments.row_num = 1
from ranked_commitments
where ranked_commitments.id = tc.id;

commit;
