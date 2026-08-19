-- Adds a soft-delete (Recycle Bin) mechanism for media_assets, so deleting a file no
-- longer immediately destroys it — it's staged as "deleted" and can be restored, or
-- permanently removed explicitly from the Trash view.

ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

-- Speeds up both the "active assets" (deleted_at IS NULL) and "trash" (deleted_at IS NOT
-- NULL) queries, which every Media Library page load now runs.
CREATE INDEX IF NOT EXISTS media_assets_deleted_at_idx ON public.media_assets (workspace_id, deleted_at);

NOTIFY pgrst, 'reload schema';
