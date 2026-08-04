-- Add delete policy for clients table
create policy "Admins and employees can delete clients"
  on public.clients for delete
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
