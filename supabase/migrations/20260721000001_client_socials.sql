CREATE TABLE IF NOT EXISTS public.client_socials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    handle VARCHAR(255),
    profile_url VARCHAR(1000),
    login_url VARCHAR(1000),
    username VARCHAR(255),
    secret TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, platform)
);

-- RLS policies
ALTER TABLE public.client_socials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view socials in their workspace" ON public.client_socials;
CREATE POLICY "Users can view socials in their workspace" ON public.client_socials
    FOR SELECT USING (workspace_id IN (select public.get_user_workspaces()));

DROP POLICY IF EXISTS "Users can insert socials in their workspace" ON public.client_socials;
CREATE POLICY "Users can insert socials in their workspace" ON public.client_socials
    FOR INSERT WITH CHECK (workspace_id IN (select public.get_user_workspaces()));

DROP POLICY IF EXISTS "Users can update socials in their workspace" ON public.client_socials;
CREATE POLICY "Users can update socials in their workspace" ON public.client_socials
    FOR UPDATE USING (workspace_id IN (select public.get_user_workspaces()));

DROP POLICY IF EXISTS "Users can delete socials in their workspace" ON public.client_socials;
CREATE POLICY "Users can delete socials in their workspace" ON public.client_socials
    FOR DELETE USING (workspace_id IN (select public.get_user_workspaces()));
