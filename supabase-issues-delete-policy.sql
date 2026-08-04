-- Add delete policy for issues table
create policy "Workspace members can delete issues"
  on public.issues for delete
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
