ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS participant_type text DEFAULT 'whole_team',
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
