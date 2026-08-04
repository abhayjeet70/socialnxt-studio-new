  -- ============================================================
  -- Fix assigned_to to support multiple employees (Collab feature)
  -- The column was uuid (single user) — change to text[] (array of user IDs)
  -- Run this in the Supabase SQL Editor
  -- ============================================================

  -- Step 1: Drop the old FK constraint and change column type to text[]
  ALTER TABLE public.posts
    DROP COLUMN IF EXISTS assigned_to;

  ALTER TABLE public.posts
    ADD COLUMN assigned_to text[] DEFAULT '{}';

  -- Step 2: Update RLS — existing policies on posts still apply (no new policy needed).
  -- The column is now a text[] so any valid array of user ID strings can be stored.
