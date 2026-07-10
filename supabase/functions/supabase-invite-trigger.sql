-- ============================================================
-- SocialNxt: Update handle_new_user trigger to handle invites
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Create the public user profile
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- 2. If they were invited, automatically add them to the workspace
  if new.raw_user_meta_data->>'invited_workspace_id' is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (
      (new.raw_user_meta_data->>'invited_workspace_id')::uuid,
      new.id,
      COALESCE(new.raw_user_meta_data->>'invited_role', 'employee')
    )
    on conflict (workspace_id, user_id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
