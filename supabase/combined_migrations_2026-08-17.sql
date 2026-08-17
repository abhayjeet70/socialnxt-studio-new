-- ============================================================================
-- Combined migration — paste directly into Supabase SQL Editor and run.
-- Bundles 7 migration files from supabase/migrations/, in order:
--   20260817090000_reconcile_schema_drift.sql
--   20260817090100_media_assets_source_type.sql
--   20260817090200_posts_reference_completed_jsonb.sql
--   20260817090300_permission_overrides.sql
--   20260817090400_client_socials_multi_account.sql
--   20260817090500_posts_platform_accounts.sql
--   20260817090600_designer_assets.sql
--
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS / DROP POLICY IF EXISTS
-- guards throughout), so it's safe to re-run this whole file if it fails partway
-- and you fix something — nothing here will error on already-applied state.
--
-- Wrapped in one transaction: if anything fails, the whole thing rolls back and
-- your database is left exactly as it was before you ran this.
--
-- ⚠️ 090200 rewrites the shape of existing posts.reference_content /
-- posts.completed_work data (TEXT[] -> jsonb). It backfills safely (existing URLs
-- become {"name": null, "url": <url>}), but take a backup/PITR checkpoint first if
-- you want a rollback path beyond this transaction.
-- ============================================================================

BEGIN;

-- ── 20260817090000_reconcile_schema_drift.sql ──────────────────────────────
-- Reconciles tracked migrations with fields that are already live but untracked:
--   1. workspace_members.agency_role (read/written by the app, never migrated)
--   2. posts.status CHECK constraint (missing 'changes_requested', which the app already writes)

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS agency_role text;

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


-- ── 20260817090100_media_assets_source_type.sql ────────────────────────────
-- Lets Media Library store an external link (e.g. Google Drive) alongside uploaded files.

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'upload';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_source_type_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_source_type_check CHECK (source_type IN ('upload', 'link'));
  END IF;
END $$;


-- ── 20260817090200_posts_reference_completed_jsonb.sql ─────────────────────
-- Changes posts.reference_content / posts.completed_work from TEXT[] (bare URLs) to
-- jsonb (array of {"name": string|null, "url": string}), so links can carry a display name.
-- Existing rows are backfilled with name: null, preserving the original URL.
--
-- Postgres does not allow a bare subquery inside ALTER COLUMN ... USING (even one
-- correlated only to the row's own column), so the transform goes through a
-- session-scoped helper function instead — USING can call a function, just not
-- inline a subquery directly.

CREATE OR REPLACE FUNCTION pg_temp._text_array_to_link_entries(arr text[])
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN arr IS NULL THEN NULL
    ELSE (SELECT jsonb_agg(jsonb_build_object('name', NULL, 'url', u)) FROM unnest(arr) AS u)
  END;
$$;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'reference_content') = 'ARRAY' THEN
    ALTER TABLE public.posts
      ALTER COLUMN reference_content TYPE jsonb
      USING pg_temp._text_array_to_link_entries(reference_content);
  END IF;

  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'completed_work') = 'ARRAY' THEN
    ALTER TABLE public.posts
      ALTER COLUMN completed_work TYPE jsonb
      USING pg_temp._text_array_to_link_entries(completed_work);
  END IF;
END $$;

DROP FUNCTION IF EXISTS pg_temp._text_array_to_link_entries(text[]);


-- ── 20260817090300_permission_overrides.sql ────────────────────────────────
-- Per-user permission overrides, layered on top of the existing role-level matrix
-- (workspaces.permissions). Only the keys explicitly set here differ from the role
-- default for that user; everything else still tracks the role.

CREATE TABLE IF NOT EXISTS public.permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view permission overrides in their workspace" ON public.permission_overrides;
CREATE POLICY "Members can view permission overrides in their workspace" ON public.permission_overrides
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspaces()));

DROP POLICY IF EXISTS "Admins manage permission overrides" ON public.permission_overrides;
CREATE POLICY "Admins manage permission overrides" ON public.permission_overrides
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );


-- ── 20260817090400_client_socials_multi_account.sql ────────────────────────
-- Allows a client to have more than one account on the same platform (e.g. two
-- Instagram handles), each distinguished by a label, with one flagged primary
-- per (client, platform) for fallback purposes.

ALTER TABLE public.client_socials DROP CONSTRAINT IF EXISTS client_socials_client_id_platform_key;
ALTER TABLE public.client_socials ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.client_socials ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS client_socials_one_primary
  ON public.client_socials (client_id, platform) WHERE is_primary;

UPDATE public.client_socials cs
SET is_primary = true
WHERE is_primary = false
  AND NOT EXISTS (
    SELECT 1 FROM public.client_socials cs2
    WHERE cs2.client_id = cs.client_id AND cs2.platform = cs.platform AND cs2.is_primary
  )
  AND (
    SELECT COUNT(*) FROM public.client_socials cs3
    WHERE cs3.client_id = cs.client_id AND cs3.platform = cs.platform
  ) = 1;


-- ── 20260817090500_posts_platform_accounts.sql ─────────────────────────────
-- Lets a post target a specific client_socials account per platform, e.g. which of
-- the client's two Instagram accounts this post is for.
-- Shape: { "Instagram": "<client_socials.id>", "Facebook": "<client_socials.id>" }

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS platform_accounts jsonb DEFAULT '{}'::jsonb;


-- ── 20260817090600_designer_assets.sql ──────────────────────────────────────
-- Designer's personal "Designs" library — private storage a designer uploads to and
-- stores work in, separate from the client-scoped Media Library. Private until the
-- designer attaches a design to a content-sheet row, at which point it becomes
-- visible to admin/allocated employees for that client via the normal posts RLS.

CREATE TABLE IF NOT EXISTS public.designer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_name text,
  mime_type text,
  tags text[],
  attached_to_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  attached_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.designer_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Designer sees own assets" ON public.designer_assets;
CREATE POLICY "Designer sees own assets" ON public.designer_assets
  FOR SELECT USING (designer_id = auth.uid());

DROP POLICY IF EXISTS "Others see only attached assets in their workspace" ON public.designer_assets;
CREATE POLICY "Others see only attached assets in their workspace" ON public.designer_assets
  FOR SELECT USING (
    attached_to_post_id IS NOT NULL
    AND workspace_id IN (SELECT public.get_user_workspaces())
  );

DROP POLICY IF EXISTS "Designer manages own assets" ON public.designer_assets;
CREATE POLICY "Designer manages own assets" ON public.designer_assets
  FOR INSERT WITH CHECK (designer_id = auth.uid());

DROP POLICY IF EXISTS "Designer updates own assets" ON public.designer_assets;
CREATE POLICY "Designer updates own assets" ON public.designer_assets
  FOR UPDATE USING (designer_id = auth.uid());

DROP POLICY IF EXISTS "Designer deletes own assets" ON public.designer_assets;
CREATE POLICY "Designer deletes own assets" ON public.designer_assets
  FOR DELETE USING (designer_id = auth.uid());

COMMIT;
