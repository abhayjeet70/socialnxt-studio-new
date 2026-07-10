-- Add 'Closed' as a valid status and closed_at, close_reason fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_reason text;

NOTIFY pgrst, 'reload schema';
