-- SocialNxt Final Consolidated Schema
-- This script contains all tables, columns, functions, triggers, and RLS policies for a complete setup.
-- Redundant queries have been merged into their final state.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  custom_platforms JSONB DEFAULT '[]'::jsonb,
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee', 'client')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  display_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  industry TEXT,
  platforms TEXT[],
  status TEXT NOT NULL DEFAULT 'Planning',
  billing_date INTEGER,
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'tiktok')),
  account_id TEXT NOT NULL, 
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users NOT NULL,
  content TEXT,
  media_urls TEXT[], 
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  client_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  client_name TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  assigned_to TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  platform TEXT,
  content_type TEXT,
  topic TEXT,
  reference_content TEXT[],
  completed_work TEXT[]
);

CREATE TABLE IF NOT EXISTS public.media_assets ( 
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  workspace_id TEXT NOT NULL, 
  uploaded_by TEXT, 
  url TEXT NOT NULL, 
  file_name TEXT, 
  mime_type TEXT, 
  tags TEXT[], 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  platform TEXT
);

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  days TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'New',
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ,
  advance_paid NUMERIC(10,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  payment_note TEXT,
  payment_history JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE,
  due_date DATE,
  line_items JSONB DEFAULT '[]'::jsonb,
  tax_rate NUMERIC DEFAULT 0,
  tax_type TEXT DEFAULT 'IGST',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  assigned_to TEXT,
  notify_admin BOOLEAN DEFAULT FALSE,
  service_type TEXT,
  transaction_type TEXT,
  issue_date DATE,
  valid_until DATE,
  line_items JSONB DEFAULT '[]'::jsonb,
  tax_rate NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Rejected')),
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  raised_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  issue_type TEXT NOT NULL DEFAULT 'Bug / Problem',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  client_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE NOT NULL,
  agenda TEXT NOT NULL,
  meet_link TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  client_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  participant_type TEXT DEFAULT 'whole_team',
  participant_ids UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  client_name TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Rejected')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url     TEXT
);

-- ==========================================
-- SEQUENCES & TRIGGERS (CLIENT DISPLAY ID)
-- ==========================================

CREATE SEQUENCE IF NOT EXISTS public.client_display_id_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_client_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'CL' || nextval('public.client_display_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_client_display_id ON public.clients;
CREATE TRIGGER trigger_generate_client_display_id
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_display_id();

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_create_post(ws_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'employee')
  );
$$;

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
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create the public user profile
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- 2. If they were invited, automatically add them to the workspace
  IF new.raw_user_meta_data->>'invited_workspace_id' IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (
      (new.raw_user_meta_data->>'invited_workspace_id')::uuid,
      new.id,
      COALESCE(new.raw_user_meta_data->>'invited_role', 'employee')
    )
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- AUTH TRIGGERS
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- STORAGE BUCKETS & POLICIES
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post_media', 'post_media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_pdfs', 'proposal_pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to post_media" ON storage.objects FOR SELECT USING ( bucket_id = 'post_media' );
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'post_media' );
CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'post_media' AND auth.uid() = owner );

CREATE POLICY "Authenticated users can upload proposal PDFs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposal_pdfs');
CREATE POLICY "Public read proposal PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'proposal_pdfs');

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_socials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Users Policies
CREATE POLICY "Anyone can view profiles" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view teammate profiles" ON public.users FOR SELECT
  USING (
    id = auth.uid() OR 
    id in (
      SELECT user_id FROM workspace_members
      WHERE workspace_id IN (SELECT public.get_user_workspaces())
    )
  );
CREATE POLICY "Users can update their own profile." ON public.users FOR UPDATE USING (auth.uid() = id);

-- Workspaces Policies
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Members can view their workspace" ON public.workspaces FOR SELECT USING ( id IN (SELECT public.get_user_workspaces()) );
CREATE POLICY "Admins can update workspace" ON public.workspaces FOR UPDATE USING ( public.is_workspace_admin(id) );
CREATE POLICY "Admins can delete workspace" ON public.workspaces FOR DELETE USING ( id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role = 'admin') );

-- Workspace Members Policies
CREATE POLICY "Users can insert themselves as member" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can view teammates" ON public.workspace_members FOR SELECT USING ( workspace_id IN (SELECT public.get_user_workspaces()) );
CREATE POLICY "Admins can update members" ON public.workspace_members FOR UPDATE USING ( public.is_workspace_admin(workspace_id) );
CREATE POLICY "Admins can delete members" ON public.workspace_members FOR DELETE USING ( public.is_workspace_admin(workspace_id) );

-- Clients Policies
CREATE POLICY "Workspace members can read clients" ON public.clients FOR SELECT USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = clients.workspace_id AND workspace_members.user_id = auth.uid()));
CREATE POLICY "Admins and employees can insert clients" ON public.clients FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = clients.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.role IN ('admin', 'employee')));
CREATE POLICY "Admins and employees can update clients" ON public.clients FOR UPDATE USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = clients.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.role IN ('admin', 'employee')));
CREATE POLICY "Admins and employees can delete clients" ON public.clients FOR DELETE USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_members.workspace_id = clients.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.role IN ('admin', 'employee')));

-- Client Socials Policies
CREATE POLICY "Users can view socials in their workspace" ON public.client_socials FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Users can insert socials in their workspace" ON public.client_socials FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Users can update socials in their workspace" ON public.client_socials FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Users can delete socials in their workspace" ON public.client_socials FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspaces()));

-- Social Accounts Policies
CREATE POLICY "Members can view social accounts" ON public.social_accounts FOR SELECT USING ( workspace_id IN (SELECT public.get_user_workspaces()) );
CREATE POLICY "Admins can manage social accounts" ON public.social_accounts FOR INSERT TO authenticated WITH CHECK ( public.is_workspace_admin(workspace_id) );
CREATE POLICY "Admins can update social accounts" ON public.social_accounts FOR UPDATE USING ( public.is_workspace_admin(workspace_id) );
CREATE POLICY "Admins can delete social accounts" ON public.social_accounts FOR DELETE USING ( public.is_workspace_admin(workspace_id) );

-- Posts Policies
CREATE POLICY "Members can view posts" ON public.posts FOR SELECT USING ( workspace_id IN (SELECT public.get_user_workspaces()) );
CREATE POLICY "Admins and employees can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK ( public.can_create_post(workspace_id) );
CREATE POLICY "Members can update posts" ON public.posts FOR UPDATE USING ( workspace_id IN (SELECT public.get_user_workspaces()) );
CREATE POLICY "Users with delete_content permission can delete posts" ON public.posts FOR DELETE USING ( public.has_permission(workspace_id, 'delete_content') );

-- Deals Policies
CREATE POLICY "Workspace members can view deals" ON public.deals FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Workspace members can create deals" ON public.deals FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Workspace members can update deals" ON public.deals FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspaces()));

-- Invoices Policies
CREATE POLICY "workspace members can view invoices" ON public.invoices FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "employees can insert invoices" ON public.invoices FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'employee')));
CREATE POLICY "employees can update invoices" ON public.invoices FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'employee')));
CREATE POLICY "admins can delete invoices" ON public.invoices FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Quotations Policies
CREATE POLICY "workspace members can view quotations" ON public.quotations FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "employees can insert quotations" ON public.quotations FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'employee')));
CREATE POLICY "employees can update quotations" ON public.quotations FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'employee')));
CREATE POLICY "admins can delete quotations" ON public.quotations FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Issues Policies
CREATE POLICY "Workspace members can view issues" ON public.issues FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Workspace members can create issues" ON public.issues FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Workspace members can update issues" ON public.issues FOR UPDATE USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Workspace members can delete issues" ON public.issues FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspaces()));

-- Meetings Policies
CREATE POLICY "Workspace members can view meetings" ON public.meetings FOR SELECT USING (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Workspace members can create meetings" ON public.meetings FOR INSERT WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces()));
CREATE POLICY "Admins and creators can delete meetings" ON public.meetings FOR DELETE USING (workspace_id IN (SELECT public.get_user_workspaces()));

-- Proposals Policies
CREATE POLICY "workspace members can view proposals" ON public.proposals FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "employees can insert proposals" ON public.proposals FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'employee')));
CREATE POLICY "employees can update proposals" ON public.proposals FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'employee')));
CREATE POLICY "admins can delete proposals" ON public.proposals FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "clients can approve proposals" ON public.proposals FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'client'));

-- Notify postgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
