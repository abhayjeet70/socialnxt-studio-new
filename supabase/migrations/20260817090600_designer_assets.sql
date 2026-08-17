-- Designer's personal "Designs" library — private storage a designer uploads to and
-- stores work in, separate from the client-scoped Media Library. Private until the
-- designer attaches a design to a content-sheet row, at which point it becomes
-- visible to admin/allocated employees for that client via the normal posts RLS.
CREATE TABLE IF NOT EXISTS public.designer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_name text,
  mime_type text,
  tags text[],
  attached_to_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  attached_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.designer_assets ENABLE ROW LEVEL SECURITY;

-- Private until attached: the designer always sees their own assets. Everyone else in
-- the workspace can only see an asset once it's attached to a post they already have
-- access to (posts are workspace-scoped, matching the rest of the app's RLS pattern).
DROP POLICY IF EXISTS "Designer sees own assets" ON public.designer_assets;
CREATE POLICY "Designer sees own assets" ON public.designer_assets
  FOR SELECT USING (designer_id = auth.uid());

DROP POLICY IF EXISTS "Others see only attached assets in their workspace" ON public.designer_assets;
CREATE POLICY "Others see only attached assets in their workspace" ON public.designer_assets
  FOR SELECT USING (
    attached_to_post_id IS NOT NULL
    AND workspace_id IN (SELECT public.get_user_workspaces())
  );

DROP POLICY IF EXISTS "Designer manages own assets" ON public.designer_assets;
CREATE POLICY "Designer manages own assets" ON public.designer_assets
  FOR INSERT WITH CHECK (designer_id = auth.uid());

DROP POLICY IF EXISTS "Designer updates own assets" ON public.designer_assets;
CREATE POLICY "Designer updates own assets" ON public.designer_assets
  FOR UPDATE USING (designer_id = auth.uid());

DROP POLICY IF EXISTS "Designer deletes own assets" ON public.designer_assets;
CREATE POLICY "Designer deletes own assets" ON public.designer_assets
  FOR DELETE USING (designer_id = auth.uid());
