alter table public.posts 
  add column if not exists platform text;

NOTIFY pgrst, 'reload schema';
