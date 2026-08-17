-- Allows a client to have more than one account on the same platform (e.g. two
-- Instagram handles), each distinguished by a label, with one flagged primary
-- per (client, platform) for fallback purposes.
ALTER TABLE public.client_socials DROP CONSTRAINT IF EXISTS client_socials_client_id_platform_key;
ALTER TABLE public.client_socials ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.client_socials ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- At most one primary account per (client, platform).
CREATE UNIQUE INDEX IF NOT EXISTS client_socials_one_primary
  ON public.client_socials (client_id, platform) WHERE is_primary;

-- Backfill: where a client+platform has exactly one row and no primary is set yet,
-- mark it primary so existing single-account clients keep working unchanged.
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
