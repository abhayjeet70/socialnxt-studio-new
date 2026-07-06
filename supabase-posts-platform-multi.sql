-- ============================================================
-- Migrate platform from single text to text[] for multi-platform support
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Step 1: Add a new array column
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}';

-- Step 2: Backfill the array column from the old single-value column
UPDATE public.posts
SET platforms = ARRAY[platform]
WHERE platform IS NOT NULL AND platform != '' AND (platforms IS NULL OR platforms = '{}');

-- Step 3: (Optional) keep old 'platform' column for backward compat — no drop needed
-- If you want to drop it later: ALTER TABLE public.posts DROP COLUMN platform;

NOTIFY pgrst, 'reload schema';
