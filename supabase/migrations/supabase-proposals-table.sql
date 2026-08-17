-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  client_name text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Rejected')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Policy: workspace members can see their workspace proposals
CREATE POLICY "workspace members can view proposals"
  ON public.proposals FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy: admins and employees can insert/update proposals
CREATE POLICY "employees can insert proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
    )
  );

CREATE POLICY "employees can update proposals"
  ON public.proposals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
    )
  );

CREATE POLICY "admins can delete proposals"
  ON public.proposals FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
