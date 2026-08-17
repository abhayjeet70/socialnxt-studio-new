-- ============================================================
-- SocialNxt RLS Fix: Allow members to view teammate profiles
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Drop the old overly restrictive policy
drop policy if exists "Users can view their own profile." on public.users;

-- Create a new policy that allows viewing anyone in the same workspace
create policy "Users can view teammate profiles" on public.users for select
  using (
    id = auth.uid() OR 
    id in (
      select user_id from workspace_members
      where workspace_id in (select public.get_user_workspaces())
    )
  );

NOTIFY pgrst, 'reload schema';
