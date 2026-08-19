-- Adds a human-readable, per-workspace-unique proposal number (mirroring quotations'
-- quotation_number), plus who/when a proposal was Approved/Rejected.

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_number text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.users(id);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS decided_at timestamptz;

-- Backfill existing rows with a stable per-workspace sequence so the new UNIQUE constraint
-- can be added without failing on NULLs/duplicates.
DO $$
DECLARE
  ws RECORD;
  r RECORD;
  n integer;
BEGIN
  FOR ws IN SELECT DISTINCT workspace_id FROM public.proposals LOOP
    n := 1;
    FOR r IN SELECT id FROM public.proposals WHERE workspace_id = ws.workspace_id ORDER BY created_at ASC LOOP
      UPDATE public.proposals SET proposal_number = 'PQ_' || LPAD(n::text, 2, '0') WHERE id = r.id AND (proposal_number IS NULL OR proposal_number = '');
      n := n + 1;
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_workspace_number_key;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_workspace_number_key UNIQUE (workspace_id, proposal_number);

NOTIFY pgrst, 'reload schema';
