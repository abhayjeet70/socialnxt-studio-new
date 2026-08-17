-- Migration to add global permissions to workspaces

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS permissions JSONB;

CREATE OR REPLACE FUNCTION public.has_permission(ws_id UUID, perm_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  ws_perms JSONB;
  is_granted BOOLEAN;
BEGIN
  -- Determine role of the current user in this workspace
  SELECT role INTO user_role 
  FROM public.workspace_members 
  WHERE workspace_id = ws_id AND user_id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin always has all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Fetch workspace custom permissions
  SELECT permissions INTO ws_perms 
  FROM public.workspaces 
  WHERE id = ws_id;
  
  -- If permissions JSONB is defined and has our key for this role, use it
  IF ws_perms IS NOT NULL AND ws_perms ? perm_key THEN
    is_granted := (ws_perms->perm_key->>user_role)::boolean;
    IF is_granted IS NOT NULL THEN
      RETURN is_granted;
    END IF;
  END IF;

  -- Fallbacks based on original DEFAULT_PERMISSIONS (for employees)
  IF user_role = 'employee' THEN
    IF perm_key IN ('view_clients', 'edit_calendar', 'view_reports', 'delete_content', 'mark_posted') THEN 
      RETURN TRUE; 
    END IF;
  END IF;
  
  -- Everything else defaults to FALSE
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update RLS Policies to use has_permission() where necessary
-- 1. Posts deletion
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Users with delete_content permission can delete posts" ON public.posts FOR DELETE USING ( public.has_permission(workspace_id, 'delete_content') );

NOTIFY pgrst, 'reload schema';
