-- Add client_id to issues table
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
