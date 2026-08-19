-- Fixes client display_id numbering to be scoped per workspace instead of one global,
-- never-decrementing sequence shared across every workspace and every deleted client ever
-- created. Symptom this fixes: a workspace with 2 visible clients showing "CL09" because the
-- global sequence had already advanced past 9 from other workspaces'/deleted clients' inserts.

-- 1. Uniqueness should be per-workspace, not global — two different workspaces having their
--    own "CL1" is expected and fine.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_display_id_key;
ALTER TABLE public.clients ADD CONSTRAINT clients_display_id_workspace_key UNIQUE (workspace_id, display_id);

-- 2. Regenerate the trigger to number new clients from that workspace's own client count,
--    with a collision-retry loop (a manually-edited display_id may already occupy a number).
CREATE OR REPLACE FUNCTION public.generate_client_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
  candidate text;
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    SELECT COUNT(*) + 1 INTO next_num FROM public.clients WHERE workspace_id = NEW.workspace_id;
    LOOP
      candidate := 'CL' || next_num;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.clients WHERE workspace_id = NEW.workspace_id AND display_id = candidate
      );
      next_num := next_num + 1;
    END LOOP;
    NEW.display_id := candidate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition itself is unchanged, but re-create it defensively in case this migration
-- runs standalone against a database that predates the original trigger.
DROP TRIGGER IF EXISTS trigger_generate_client_display_id ON public.clients;
CREATE TRIGGER trigger_generate_client_display_id
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_display_id();

-- 3. One-time backfill: renumber every workspace's EXISTING clients sequentially (CL1, CL2, ...)
--    ordered by created_at, so already-desynced IDs are corrected now, not just for future inserts.
--    NOTE: this changes the visible CLxx label of existing clients. If any exported invoice/
--    proposal already references a client by its old CLxx label, that label will differ after
--    this runs.
-- Two-phase: the UNIQUE(workspace_id, display_id) constraint is checked immediately (not
-- deferrable), so straight-line renumbering can collide with a not-yet-updated row that still
-- holds the target value (e.g. row A wants "CL1" but row B, not yet processed, currently IS
-- "CL1"). Stage everything through a value that can never collide with "CLn" first.
DO $$
DECLARE
  ws RECORD;
  r RECORD;
  n integer;
BEGIN
  FOR ws IN SELECT DISTINCT workspace_id FROM public.clients LOOP
    UPDATE public.clients SET display_id = 'TMP-' || id WHERE workspace_id = ws.workspace_id;

    n := 1;
    FOR r IN SELECT id FROM public.clients WHERE workspace_id = ws.workspace_id ORDER BY created_at ASC LOOP
      UPDATE public.clients SET display_id = 'CL' || n WHERE id = r.id;
      n := n + 1;
    END LOOP;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
