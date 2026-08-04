-- Allow any authenticated user to view basic user profiles
drop policy if exists "Users can view their own profile." on public.users;
drop policy if exists "Users can view teammate profiles" on public.users;

create policy "Anyone can view profiles" 
  on public.users for select 
  to authenticated 
  using (true);

NOTIFY pgrst, 'reload schema';
