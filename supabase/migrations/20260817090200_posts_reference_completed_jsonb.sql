-- Changes posts.reference_content / posts.completed_work from TEXT[] (bare URLs) to
-- jsonb (array of {"name": string|null, "url": string}), so links can carry a display name.
-- Existing rows are backfilled with name: null, preserving the original URL.
-- Guarded so it's a no-op if already applied (column already jsonb).
--
-- Postgres does not allow a bare subquery inside ALTER COLUMN ... USING (even one
-- correlated only to the row's own column), so the transform is done via a helper
-- function instead — USING can call a function, just not inline a subquery.

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
