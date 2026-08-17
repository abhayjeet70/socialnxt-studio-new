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
