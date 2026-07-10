-- ============================================================
-- SocialNxt RLS Policies  (v2 — fixed)
-- Run this in the Supabase SQL Editor
-- If you ran v1 before, run the DROP section first, then the CREATE section.
-- ============================================================

-- ─── DROP OLD POLICIES (run if you already ran v1) ─────────────────────────
drop policy if exists "Authenticated users can create workspaces"   on public.workspaces;
drop policy if exists "Members can view their workspace"             on public.workspaces;
drop policy if exists "Admins can update workspace"                  on public.workspaces;
drop policy if exists "Users can insert themselves as admin"         on public.workspace_members;
drop policy if exists "Members can view teammates"                   on public.workspace_members;
drop policy if exists "Admins can manage members"                    on public.workspace_members;
drop policy if exists "Members can view posts"                       on public.posts;
drop policy if exists "Admins and employees can create posts"        on public.posts;
drop policy if exists "Admins and employees can update posts"        on public.posts;
drop policy if exists "Admins can delete posts"                      on public.posts;
drop policy if exists "Admins can manage social accounts"            on public.social_accounts;
drop policy if exists "Members can view social accounts"             on public.social_accounts;

-- ─── WORKSPACES ────────────────────────────────────────────────────────────

-- Any signed-in user can create a workspace (needed for onboarding)
create policy "Authenticated users can create workspaces"
  on public.workspaces
  for insert
  to authenticated
  with check (true);

-- Users can only view workspaces they are a member of
create policy "Members can view their workspace"
  on public.workspaces
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id
        and wm.user_id = auth.uid()
    )
  );

-- Only admins can update workspace details
create policy "Admins can update workspace"
  on public.workspaces
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- ─── WORKSPACE MEMBERS ─────────────────────────────────────────────────────

-- A signed-in user can add THEMSELVES to a workspace
-- (covers: first-time admin onboarding + accepting an invite link)
create policy "Users can insert themselves as member"
  on public.workspace_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Members can see other members in the same workspace
create policy "Members can view teammates"
  on public.workspace_members
  for select
  using (
    exists (
      select 1 from public.workspace_members wm2
      where wm2.workspace_id = workspace_id
        and wm2.user_id = auth.uid()
    )
  );

-- Only admins can update or delete member rows
create policy "Admins can update or remove members"
  on public.workspace_members
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Admins can delete members"
  on public.workspace_members
  for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- ─── POSTS ─────────────────────────────────────────────────────────────────

-- All workspace members can read posts
create policy "Members can view posts"
  on public.posts
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Admins and employees can create posts
create policy "Admins and employees can create posts"
  on public.posts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('admin', 'employee')
    )
  );

-- Admins, employees, and clients can update post status (for approval workflow)
create policy "Members can update posts"
  on public.posts
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Only admins can delete posts
create policy "Admins can delete posts"
  on public.posts
  for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- ─── SOCIAL ACCOUNTS ───────────────────────────────────────────────────────

-- All workspace members can view connected accounts
create policy "Members can view social accounts"
  on public.social_accounts
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Only admins can connect, update, or delete social accounts
create policy "Admins can manage social accounts"
  on public.social_accounts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Admins can update social accounts"
  on public.social_accounts
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Admins can delete social accounts"
  on public.social_accounts
  for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );
