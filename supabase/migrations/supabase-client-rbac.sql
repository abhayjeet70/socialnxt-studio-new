-- Add client_id to meetings so they can be optionally scoped to a client
alter table public.meetings add column client_id uuid references public.users(id) on delete set null;

-- Add client_id to posts so they can be assigned to a specific client
alter table public.posts add column client_id uuid references public.users(id) on delete set null;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
