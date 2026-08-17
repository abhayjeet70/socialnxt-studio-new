-- Create clients table
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  name text not null,
  email text,
  industry text,
  platforms text[],
  status text not null default 'Planning',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.clients enable row level security;

-- Policies for clients (all workspace members can read)
create policy "Workspace members can read clients"
  on public.clients for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Only admins/employees can insert/update clients
create policy "Admins and employees can insert clients"
  on public.clients for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'employee')
    )
  );

create policy "Admins and employees can update clients"
  on public.clients for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'employee')
    )
  );

-- Notify postgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
