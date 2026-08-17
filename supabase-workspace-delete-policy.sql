-- Add delete policy for workspaces table
create policy "Admins can delete workspace"
  on public.workspaces for delete
  using (
    id in (
      select workspace_id 
      from public.workspace_members 
      where user_id = auth.uid() 
      and role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
