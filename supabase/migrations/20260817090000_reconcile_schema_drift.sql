-- Reconciles tracked migrations with fields that are already live but untracked:
--   1. workspace_members.agency_role (read/written by the app, never migrated)
--   2. posts.status CHECK constraint (missing 'changes_requested', which the app already writes)
-- Idempotent: safe to run against a DB that already has either fix applied by hand.

-- 1. agency_role column (nullable, no forced default — see 20260817090001 for the fix to
--    the app-side default that was silently treating unset agency_role as "Social Media Manager")
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS agency_role text;

-- 2. posts.status CHECK constraint — drop whatever check constraint currently governs
--    `status` (name may differ if it was hand-patched already) and recreate it with the
--    full, correct set of values the app actually uses.
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(c.conkey)
    WHERE rel.relname = 'posts' AND c.contype = 'c' AND att.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'pending_approval', 'changes_requested', 'approved', 'scheduled', 'published', 'failed'));
