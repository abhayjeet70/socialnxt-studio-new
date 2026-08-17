-- Create issues table
create table if not exists public.issues (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  raised_by uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  issue_type text not null default 'Bug / Problem',
  priority text not null default 'Medium',
  status text not null default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.issues enable row level security;

create policy "Workspace members can view issues"
  on public.issues for select
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can create issues"
  on public.issues for insert
  with check (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can update issues"
  on public.issues for update
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
