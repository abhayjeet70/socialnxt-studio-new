ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS updated_at timestamptz;

NOTIFY pgrst, 'reload schema';
