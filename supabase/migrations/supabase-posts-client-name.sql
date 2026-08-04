-- Add client_name to posts so they can be assigned to a specific client name
alter table public.posts add column if not exists client_name text;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
