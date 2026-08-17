CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id text NOT NULL,
  client_name text NOT NULL,
  invoice_number text NOT NULL,
  issue_date date,
  due_date date,
  line_items jsonb DEFAULT '[]'::jsonb,
  tax_rate numeric DEFAULT 0,
  tax_type text DEFAULT 'IGST',
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  extra_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view invoices"
  ON public.invoices FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "employees can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
    )
  );

CREATE POLICY "employees can update invoices"
  ON public.invoices FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
    )
  );

CREATE POLICY "admins can delete invoices"
  ON public.invoices FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );