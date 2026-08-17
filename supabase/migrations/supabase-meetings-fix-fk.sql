alter table public.meetings drop constraint meetings_created_by_fkey;

alter table public.meetings 
  add constraint meetings_created_by_fkey 
  foreign key (created_by) 
  references public.users(id) 
  on delete cascade;

NOTIFY pgrst, 'reload schema';
