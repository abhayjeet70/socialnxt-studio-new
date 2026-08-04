create table if not exists public.meetings (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  agenda text not null,
  meet_link text not null,
  scheduled_at timestamp with time zone not null,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.meetings enable row level security;

create policy "Workspace members can view meetings"
  on public.meetings for select
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can create meetings"
  on public.meetings for insert
  with check (workspace_id in (select public.get_user_workspaces()));

create policy "Admins and creators can delete meetings"
  on public.meetings for delete
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
