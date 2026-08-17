-- Add approval tracking fields to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Backfill existing data for posts that are already approved, scheduled, or published
UPDATE public.posts
SET 
  approved_by = COALESCE(client_name, 'Workspace Client'),
  approved_at = updated_at
WHERE 
  status IN ('approved', 'scheduled', 'published')
  AND approved_by IS NULL;
