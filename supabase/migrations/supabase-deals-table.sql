create table if not exists public.deals (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  client_name text not null,
  project_name text not null,
  amount numeric not null,
  days text not null,
  stage text not null default 'New',
  created_by uuid references public.users(id) on delete cascade not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.deals enable row level security;

create policy "Workspace members can view deals"
  on public.deals for select
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can create deals"
  on public.deals for insert
  with check (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can update deals"
  on public.deals for update
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Admins can delete deals"
  on public.deals for delete
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
