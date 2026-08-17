-- Per-user permission overrides, layered on top of the existing role-level matrix
-- (workspaces.permissions). Only the keys explicitly set here differ from the role
-- default for that user; everything else still tracks the role.
CREATE TABLE IF NOT EXISTS public.permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view permission overrides in their workspace" ON public.permission_overrides;
CREATE POLICY "Members can view permission overrides in their workspace" ON public.permission_overrides
  FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspaces()));

DROP POLICY IF EXISTS "Admins manage permission overrides" ON public.permission_overrides;
CREATE POLICY "Admins manage permission overrides" ON public.permission_overrides
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );
