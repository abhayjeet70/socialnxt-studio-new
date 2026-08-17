-- ============================================================
-- SocialNxt RLS Policies (v3 — fixed infinite recursion)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. DROP ALL OLD POLICIES ──────────────────────────────────────────────
drop policy if exists "Authenticated users can create workspaces"   on public.workspaces;
drop policy if exists "Members can view their workspace"             on public.workspaces;
drop policy if exists "Admins can update workspace"                  on public.workspaces;

drop policy if exists "Users can insert themselves as member"        on public.workspace_members;
drop policy if exists "Members can view teammates"                   on public.workspace_members;
drop policy if exists "Admins can update or remove members"          on public.workspace_members;
drop policy if exists "Admins can delete members"                    on public.workspace_members;

drop policy if exists "Members can view posts"                       on public.posts;
drop policy if exists "Admins and employees can create posts"        on public.posts;
drop policy if exists "Members can update posts"                     on public.posts;
drop policy if exists "Admins can delete posts"                      on public.posts;

drop policy if exists "Members can view social accounts"             on public.social_accounts;
drop policy if exists "Admins can manage social accounts"            on public.social_accounts;
drop policy if exists "Admins can update social accounts"            on public.social_accounts;
drop policy if exists "Admins can delete social accounts"            on public.social_accounts;


-- ─── 2. HELPER FUNCTIONS (Bypasses RLS to prevent infinite recursion) ──────
create or replace function public.get_user_workspaces()
returns setof uuid
language sql
security definer -- This makes the function run bypassing RLS!
set search_path = public
as $$
  select workspace_id from workspace_members where user_id = auth.uid();
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.can_create_post(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('admin', 'employee')
  );
$$;


-- ─── 3. WORKSPACES ─────────────────────────────────────────────────────────
create policy "Authenticated users can create workspaces"
  on public.workspaces for insert to authenticated with check (true);

create policy "Members can view their workspace"
  on public.workspaces for select
  using ( id in (select public.get_user_workspaces()) );

create policy "Admins can update workspace"
  on public.workspaces for update
  using ( public.is_workspace_admin(id) );


-- ─── 4. WORKSPACE MEMBERS ──────────────────────────────────────────────────
create policy "Users can insert themselves as member"
  on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "Members can view teammates"
  on public.workspace_members for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can update members"
  on public.workspace_members for update
  using ( public.is_workspace_admin(workspace_id) );

create policy "Admins can delete members"
  on public.workspace_members for delete
  using ( public.is_workspace_admin(workspace_id) );


-- ─── 5. POSTS ──────────────────────────────────────────────────────────────
create policy "Members can view posts"
  on public.posts for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins and employees can create posts"
  on public.posts for insert to authenticated
  with check ( public.can_create_post(workspace_id) );

create policy "Members can update posts"
  on public.posts for update
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can delete posts"
  on public.posts for delete
  using ( public.is_workspace_admin(workspace_id) );


-- ─── 6. SOCIAL ACCOUNTS ────────────────────────────────────────────────────
create policy "Members can view social accounts"
  on public.social_accounts for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can manage social accounts"
  on public.social_accounts for insert to authenticated
  with check ( public.is_workspace_admin(workspace_id) );

create policy "Admins can update social accounts"
  on public.social_accounts for update
  using ( public.is_workspace_admin(workspace_id) );

create policy "Admins can delete social accounts"
  on public.social_accounts for delete
  using ( public.is_workspace_admin(workspace_id) );
