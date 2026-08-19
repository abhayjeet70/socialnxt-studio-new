-- Records who changed a post's status and when, so the Content Sheet and Activity Logs
-- can show a real actor/timestamp instead of guessing from the post's original author.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES public.users(id);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

NOTIFY pgrst, 'reload schema';
