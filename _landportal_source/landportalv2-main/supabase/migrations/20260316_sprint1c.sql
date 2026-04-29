create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'reviewer')) default 'reviewer',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'reviewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  location text not null default '',
  status text not null check (status in ('draft', 'active', 'review', 'archived')) default 'draft',
  point_count integer not null default 0,
  color text not null default 'linear-gradient(135deg, #d7e4f4, #eef3fb 70%, #ffffff)',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'reviewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_workspace_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspace_members_select_self" on public.workspace_members;
create policy "workspace_members_select_self"
on public.workspace_members
for select
using (user_id = auth.uid());

drop policy if exists "workspaces_select_current_workspace" on public.workspaces;
create policy "workspaces_select_current_workspace"
on public.workspaces
for select
using (id = public.current_workspace_id());

drop policy if exists "projects_select_current_workspace" on public.projects;
create policy "projects_select_current_workspace"
on public.projects
for select
using (workspace_id = public.current_workspace_id());

drop policy if exists "projects_insert_admin_editor" on public.projects;
create policy "projects_insert_admin_editor"
on public.projects
for insert
with check (
  owner_id = auth.uid()
  and workspace_id = public.current_workspace_id()
  and public.current_workspace_role() in ('admin', 'editor')
);

drop policy if exists "projects_update_admin_editor" on public.projects;
create policy "projects_update_admin_editor"
on public.projects
for update
using (
  workspace_id = public.current_workspace_id()
  and public.current_workspace_role() in ('admin', 'editor')
)
with check (
  workspace_id = public.current_workspace_id()
  and public.current_workspace_role() in ('admin', 'editor')
);

drop policy if exists "project_members_select_current_workspace" on public.project_members;
create policy "project_members_select_current_workspace"
on public.project_members
for select
using (
  project_id in (
    select id from public.projects where workspace_id = public.current_workspace_id()
  )
);
