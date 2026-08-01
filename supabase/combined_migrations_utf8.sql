create table public.media_assets ( id uuid default gen_random_uuid() primary key, workspace_id text not null, uploaded_by text, url text not null, file_name text, mime_type text, tags text[], created_at timestamp with time zone default timezone('utc'::text, now()) not null );
-- Add client_id to media_assets if it does not exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'media_assets' 
          AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.media_assets 
        ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;
-- Add platform column to media_assets
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'media_assets' 
          AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.media_assets 
        ADD COLUMN platform text;
    END IF;
END $$;

-- Notify postgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
-- Add custom_platforms JSONB array to workspaces table
alter table public.workspaces add column if not exists custom_platforms jsonb default '[]'::jsonb;
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
-- Add phone column to public.users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone text;
-- Add client_id to meetings so they can be optionally scoped to a client
alter table public.meetings add column client_id uuid references public.users(id) on delete set null;

-- Add client_id to posts so they can be assigned to a specific client
alter table public.posts add column client_id uuid references public.users(id) on delete set null;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- Add 'Closed' as a valid status and closed_at, close_reason fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_reason text;

NOTIFY pgrst, 'reload schema';
-- Add delete policy for clients table
create policy "Admins and employees can delete clients"
  on public.clients for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'employee')
    )
  );

-- Notify postgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
-- Create clients table
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  name text not null,
  email text,
  industry text,
  platforms text[],
  status text not null default 'Planning',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.clients enable row level security;

-- Policies for clients (all workspace members can read)
create policy "Workspace members can read clients"
  on public.clients for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Only admins/employees can insert/update clients
create policy "Admins and employees can insert clients"
  on public.clients for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'employee')
    )
  );

create policy "Admins and employees can update clients"
  on public.clients for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = clients.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'employee')
    )
  );

-- Notify postgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS advance_paid numeric DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_note text;
create table if not exists public.deals (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  client_name text not null,
  project_name text not null,
  amount numeric not null,
  days text not null,
  stage text not null default 'New',
  created_by uuid references public.users(id) on delete cascade not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.deals enable row level security;

create policy "Workspace members can view deals"
  on public.deals for select
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can create deals"
  on public.deals for insert
  with check (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can update deals"
  on public.deals for update
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Admins can delete deals"
  on public.deals for delete
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS updated_at timestamptz;

NOTIFY pgrst, 'reload schema';
-- Insert demo clients into YOUR specific workspace only
DO $$ 
DECLARE
  wid uuid;
BEGIN
  -- Find the workspace associated with your email
  SELECT workspace_id INTO wid 
  FROM public.workspace_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'abhayjeet5465@gmail.com' LIMIT 1)
  LIMIT 1;

  IF wid IS NOT NULL THEN
    INSERT INTO public.clients (workspace_id, name, email, industry, platforms, status)
    VALUES
      (wid, 'Sukriti Sampada', 'contact@sukriti.com', 'Education', ARRAY['Instagram', 'Facebook', 'YouTube'], 'Designing'),
      (wid, 'AAS NGO', 'info@aasngo.org', 'Non-Profit', ARRAY['Facebook', 'Instagram', 'LinkedIn'], 'Review'),
      (wid, 'Golden Brix', 'marketing@goldenbrix.com', 'Construction', ARRAY['Instagram', 'LinkedIn'], 'Planning'),
      (wid, 'Sav Zaman Boxing', 'sav@boxing.com', 'Sports & Fitness', ARRAY['Instagram', 'YouTube'], 'Published'),
      (wid, 'WebNxt', 'hello@webnxt.com', 'Technology', ARRAY['LinkedIn', 'Instagram', 'YouTube'], 'Editing'),
      (wid, 'Sunita Real Estate', 'sunita@realestate.com', 'Real Estate', ARRAY['Instagram', 'Facebook'], 'Designing'),
      (wid, 'Royal Properties', 'royal@properties.com', 'Real Estate', ARRAY['Instagram', 'Facebook', 'YouTube'], 'Completed')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Demo clients successfully added to your workspace!';
  ELSE
    RAISE NOTICE 'Could not find a workspace for this email account.';
  END IF;
END $$;
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
-- Add client_id to issues table
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
-- Create issues table
create table if not exists public.issues (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  raised_by uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  issue_type text not null default 'Bug / Problem',
  priority text not null default 'Medium',
  status text not null default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.issues enable row level security;

create policy "Workspace members can view issues"
  on public.issues for select
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can create issues"
  on public.issues for insert
  with check (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can update issues"
  on public.issues for update
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
alter table public.meetings drop constraint meetings_created_by_fkey;

alter table public.meetings 
  add constraint meetings_created_by_fkey 
  foreign key (created_by) 
  references public.users(id) 
  on delete cascade;

NOTIFY pgrst, 'reload schema';
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS participant_type text DEFAULT 'whole_team',
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
create table if not exists public.meetings (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  agenda text not null,
  meet_link text not null,
  scheduled_at timestamp with time zone not null,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.meetings enable row level security;

create policy "Workspace members can view meetings"
  on public.meetings for select
  using (workspace_id in (select public.get_user_workspaces()));

create policy "Workspace members can create meetings"
  on public.meetings for insert
  with check (workspace_id in (select public.get_user_workspaces()));

create policy "Admins and creators can delete meetings"
  on public.meetings for delete
  using (workspace_id in (select public.get_user_workspaces()));

NOTIFY pgrst, 'reload schema';
-- Add approval tracking fields to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Backfill existing data for posts that are already approved, scheduled, or published
UPDATE public.posts
SET 
  approved_by = COALESCE(client_name, 'Workspace Client'),
  approved_at = updated_at
WHERE 
  status IN ('approved', 'scheduled', 'published')
  AND approved_by IS NULL;
  -- ============================================================
  -- Fix assigned_to to support multiple employees (Collab feature)
  -- The column was uuid (single user) â€” change to text[] (array of user IDs)
  -- Run this in the Supabase SQL Editor
  -- ============================================================

  -- Step 1: Drop the old FK constraint and change column type to text[]
  ALTER TABLE public.posts
    DROP COLUMN IF EXISTS assigned_to;

  ALTER TABLE public.posts
    ADD COLUMN assigned_to text[] DEFAULT '{}';

  -- Step 2: Update RLS â€” existing policies on posts still apply (no new policy needed).
  -- The column is now a text[] so any valid array of user ID strings can be stored.
-- Add client_name to posts so they can be assigned to a specific client name
alter table public.posts add column if not exists client_name text;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- ============================================================
-- Migrate platform from single text to text[] for multi-platform support
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Step 1: Add a new array column
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}';

-- Step 2: Backfill the array column from the old single-value column
UPDATE public.posts
SET platforms = ARRAY[platform]
WHERE platform IS NOT NULL AND platform != '' AND (platforms IS NULL OR platforms = '{}');

-- Step 3: (Optional) keep old 'platform' column for backward compat â€” no drop needed
-- If you want to drop it later: ALTER TABLE public.posts DROP COLUMN platform;

NOTIFY pgrst, 'reload schema';
-- Add pdf_url column to proposals table
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- Allow anyone with access to the storage bucket to read
-- (bucket must be public or use signed URLs)

-- Create a dedicated Storage bucket for proposal PDFs (if not done already)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_pdfs', 'proposal_pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload proposal PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proposal_pdfs');

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read proposal PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposal_pdfs');

-- Allow clients to UPDATE proposal status (for approving)
CREATE POLICY "clients can approve proposals"
  ON public.proposals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );
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
-- Allow any authenticated user to view basic user profiles
drop policy if exists "Users can view their own profile." on public.users;
drop policy if exists "Users can view teammate profiles" on public.users;

create policy "Anyone can view profiles" 
  on public.users for select 
  to authenticated 
  using (true);

NOTIFY pgrst, 'reload schema';
-- ============================================================
-- SocialNxt RLS Policies (v3 â€” fixed infinite recursion)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- â”€â”€â”€ 1. DROP ALL OLD POLICIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Authenticated users can create workspaces"   on public.workspaces;
drop policy if exists "Members can view their workspace"             on public.workspaces;
drop policy if exists "Admins can update workspace"                  on public.workspaces;

drop policy if exists "Users can insert themselves as member"        on public.workspace_members;
drop policy if exists "Members can view teammates"                   on public.workspace_members;
drop policy if exists "Admins can update or remove members"          on public.workspace_members;
drop policy if exists "Admins can delete members"                    on public.workspace_members;

drop policy if exists "Members can view posts"                       on public.posts;
drop policy if exists "Admins and employees can create posts"        on public.posts;
drop policy if exists "Members can update posts"                     on public.posts;
drop policy if exists "Admins can delete posts"                      on public.posts;

drop policy if exists "Members can view social accounts"             on public.social_accounts;
drop policy if exists "Admins can manage social accounts"            on public.social_accounts;
drop policy if exists "Admins can update social accounts"            on public.social_accounts;
drop policy if exists "Admins can delete social accounts"            on public.social_accounts;


-- â”€â”€â”€ 2. HELPER FUNCTIONS (Bypasses RLS to prevent infinite recursion) â”€â”€â”€â”€â”€â”€
create or replace function public.get_user_workspaces()
returns setof uuid
language sql
security definer -- This makes the function run bypassing RLS!
set search_path = public
as $$
  select workspace_id from workspace_members where user_id = auth.uid();
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.can_create_post(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('admin', 'employee')
  );
$$;


-- â”€â”€â”€ 3. WORKSPACES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Authenticated users can create workspaces"
  on public.workspaces for insert to authenticated with check (true);

create policy "Members can view their workspace"
  on public.workspaces for select
  using ( id in (select public.get_user_workspaces()) );

create policy "Admins can update workspace"
  on public.workspaces for update
  using ( public.is_workspace_admin(id) );


-- â”€â”€â”€ 4. WORKSPACE MEMBERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Users can insert themselves as member"
  on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "Members can view teammates"
  on public.workspace_members for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can update members"
  on public.workspace_members for update
  using ( public.is_workspace_admin(workspace_id) );

create policy "Admins can delete members"
  on public.workspace_members for delete
  using ( public.is_workspace_admin(workspace_id) );


-- â”€â”€â”€ 5. POSTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Members can view posts"
  on public.posts for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins and employees can create posts"
  on public.posts for insert to authenticated
  with check ( public.can_create_post(workspace_id) );

create policy "Members can update posts"
  on public.posts for update
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can delete posts"
  on public.posts for delete
  using ( public.is_workspace_admin(workspace_id) );


-- â”€â”€â”€ 6. SOCIAL ACCOUNTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Members can view social accounts"
  on public.social_accounts for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can manage social accounts"
  on public.social_accounts for insert to authenticated
  with check ( public.is_workspace_admin(workspace_id) );

create policy "Admins can update social accounts"
  on public.social_accounts for update
  using ( public.is_workspace_admin(workspace_id) );

create policy "Admins can delete social accounts"
  on public.social_accounts for delete
  using ( public.is_workspace_admin(workspace_id) );
-- ============================================================
-- SocialNxt RLS Policies (v4 â€” The Ultimate Fix)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- â”€â”€â”€ 1. DROP ALL PREVIOUS POLICIES (v1, v2, v3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Authenticated users can create workspaces" on public.workspaces;
drop policy if exists "Members can view their workspace" on public.workspaces;
drop policy if exists "Admins can update workspace" on public.workspaces;

-- Workspace Members
drop policy if exists "Users can insert themselves as admin" on public.workspace_members;
drop policy if exists "Users can insert themselves as member" on public.workspace_members;
drop policy if exists "Members can view teammates" on public.workspace_members;
drop policy if exists "Admins can manage members" on public.workspace_members; -- This was the v1 zombie policy causing the recursion!
drop policy if exists "Admins can update or remove members" on public.workspace_members;
drop policy if exists "Admins can update members" on public.workspace_members;
drop policy if exists "Admins can delete members" on public.workspace_members;

-- Posts
drop policy if exists "Members can view posts" on public.posts;
drop policy if exists "Admins and employees can create posts" on public.posts;
drop policy if exists "Admins and employees can update posts" on public.posts;
drop policy if exists "Members can update posts" on public.posts;
drop policy if exists "Admins can delete posts" on public.posts;

-- Social Accounts
drop policy if exists "Admins can manage social accounts" on public.social_accounts;
drop policy if exists "Members can view social accounts" on public.social_accounts;
drop policy if exists "Admins can update social accounts" on public.social_accounts;
drop policy if exists "Admins can delete social accounts" on public.social_accounts;


-- â”€â”€â”€ 2. HELPER FUNCTIONS (Bypasses RLS to prevent infinite recursion) â”€â”€â”€â”€â”€â”€
create or replace function public.get_user_workspaces()
returns setof uuid
language sql
security definer -- Bypasses RLS
set search_path = public
as $$
  select workspace_id from workspace_members where user_id = auth.uid();
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.can_create_post(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('admin', 'employee')
  );
$$;


-- â”€â”€â”€ 3. WORKSPACES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Authenticated users can create workspaces"
  on public.workspaces for insert to authenticated with check (true);

create policy "Members can view their workspace"
  on public.workspaces for select
  using ( id in (select public.get_user_workspaces()) );

create policy "Admins can update workspace"
  on public.workspaces for update
  using ( public.is_workspace_admin(id) );


-- â”€â”€â”€ 4. WORKSPACE MEMBERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Users can insert themselves as member"
  on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "Members can view teammates"
  on public.workspace_members for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can update members"
  on public.workspace_members for update
  using ( public.is_workspace_admin(workspace_id) );

create policy "Admins can delete members"
  on public.workspace_members for delete
  using ( public.is_workspace_admin(workspace_id) );


-- â”€â”€â”€ 5. POSTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Members can view posts"
  on public.posts for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins and employees can create posts"
  on public.posts for insert to authenticated
  with check ( public.can_create_post(workspace_id) );

create policy "Members can update posts"
  on public.posts for update
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can delete posts"
  on public.posts for delete
  using ( public.is_workspace_admin(workspace_id) );


-- â”€â”€â”€ 6. SOCIAL ACCOUNTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create policy "Members can view social accounts"
  on public.social_accounts for select
  using ( workspace_id in (select public.get_user_workspaces()) );

create policy "Admins can manage social accounts"
  on public.social_accounts for insert to authenticated
  with check ( public.is_workspace_admin(workspace_id) );

create policy "Admins can update social accounts"
  on public.social_accounts for update
  using ( public.is_workspace_admin(workspace_id) );

create policy "Admins can delete social accounts"
  on public.social_accounts for delete
  using ( public.is_workspace_admin(workspace_id) );
-- ============================================================
-- SocialNxt RLS Policies  (v2 â€” fixed)
-- Run this in the Supabase SQL Editor
-- If you ran v1 before, run the DROP section first, then the CREATE section.
-- ============================================================

-- â”€â”€â”€ DROP OLD POLICIES (run if you already ran v1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
drop policy if exists "Authenticated users can create workspaces"   on public.workspaces;
drop policy if exists "Members can view their workspace"             on public.workspaces;
drop policy if exists "Admins can update workspace"                  on public.workspaces;
drop policy if exists "Users can insert themselves as admin"         on public.workspace_members;
drop policy if exists "Members can view teammates"                   on public.workspace_members;
drop policy if exists "Admins can manage members"                    on public.workspace_members;
drop policy if exists "Members can view posts"                       on public.posts;
drop policy if exists "Admins and employees can create posts"        on public.posts;
drop policy if exists "Admins and employees can update posts"        on public.posts;
drop policy if exists "Admins can delete posts"                      on public.posts;
drop policy if exists "Admins can manage social accounts"            on public.social_accounts;
drop policy if exists "Members can view social accounts"             on public.social_accounts;

-- â”€â”€â”€ WORKSPACES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Any signed-in user can create a workspace (needed for onboarding)
create policy "Authenticated users can create workspaces"
  on public.workspaces
  for insert
  to authenticated
  with check (true);

-- Users can only view workspaces they are a member of
create policy "Members can view their workspace"
  on public.workspaces
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id
        and wm.user_id = auth.uid()
    )
  );

-- Only admins can update workspace details
create policy "Admins can update workspace"
  on public.workspaces
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- â”€â”€â”€ WORKSPACE MEMBERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- A signed-in user can add THEMSELVES to a workspace
-- (covers: first-time admin onboarding + accepting an invite link)
create policy "Users can insert themselves as member"
  on public.workspace_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Members can see other members in the same workspace
create policy "Members can view teammates"
  on public.workspace_members
  for select
  using (
    exists (
      select 1 from public.workspace_members wm2
      where wm2.workspace_id = workspace_id
        and wm2.user_id = auth.uid()
    )
  );

-- Only admins can update or delete member rows
create policy "Admins can update or remove members"
  on public.workspace_members
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Admins can delete members"
  on public.workspace_members
  for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- â”€â”€â”€ POSTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- All workspace members can read posts
create policy "Members can view posts"
  on public.posts
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Admins and employees can create posts
create policy "Admins and employees can create posts"
  on public.posts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('admin', 'employee')
    )
  );

-- Admins, employees, and clients can update post status (for approval workflow)
create policy "Members can update posts"
  on public.posts
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Only admins can delete posts
create policy "Admins can delete posts"
  on public.posts
  for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- â”€â”€â”€ SOCIAL ACCOUNTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- All workspace members can view connected accounts
create policy "Members can view social accounts"
  on public.social_accounts
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Only admins can connect, update, or delete social accounts
create policy "Admins can manage social accounts"
  on public.social_accounts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Admins can update social accounts"
  on public.social_accounts
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create policy "Admins can delete social accounts"
  on public.social_accounts
  for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );
-- ============================================================
-- SocialNxt RLS Fix: Allow members to view teammate profiles
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Drop the old overly restrictive policy
drop policy if exists "Users can view their own profile." on public.users;

-- Create a new policy that allows viewing anyone in the same workspace
create policy "Users can view teammate profiles" on public.users for select
  using (
    id = auth.uid() OR 
    id in (
      select user_id from workspace_members
      where workspace_id in (select public.get_user_workspaces())
    )
  );

NOTIFY pgrst, 'reload schema';
alter table public.posts 
  add column if not exists platform text;

NOTIFY pgrst, 'reload schema';
-- ============================================================
-- SocialNxt Schema Update: Tasks / Spreadsheet View
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to the posts table to support the spreadsheet view
alter table public.posts 
  add column if not exists content_type text,
  add column if not exists topic text,
  add column if not exists reference_content text[], -- Array of strings (URLs or text)
  add column if not exists completed_work text[];    -- Array of strings (URLs or text)

-- 2. Create Storage Bucket for Media Uploads
insert into storage.buckets (id, name, public) 
values ('post_media', 'post_media', true)
on conflict (id) do nothing;

-- 3. Storage RLS Policies
-- Allow anyone to read public media
create policy "Public Access to post_media"
  on storage.objects for select
  using ( bucket_id = 'post_media' );

-- Allow authenticated users to upload media
create policy "Authenticated users can upload media"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'post_media' );

-- Allow users to delete their own uploads
create policy "Users can delete their own media"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'post_media' and auth.uid() = owner );
-- SocialNxt Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Users Table (Extends Supabase Auth)
-- ==========================================
create table public.users (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure the users table
alter table public.users enable row level security;
create policy "Users can view their own profile." on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile." on public.users for update using (auth.uid() = id);

-- ==========================================
-- 2. Workspaces (Agencies)
-- ==========================================
create table public.workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspaces enable row level security;

-- ==========================================
-- 3. Workspace Members (RBAC)
-- ==========================================
-- Roles: admin, employee, client
create table public.workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  role text not null check (role in ('admin', 'employee', 'client')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- ==========================================
-- 4. Social Accounts (OAuth connections)
-- ==========================================
create table public.social_accounts (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin', 'twitter', 'tiktok')),
  account_id text not null, -- The ID from the social platform
  account_name text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.social_accounts enable row level security;

-- ==========================================
-- 5. Posts (Content Calendar)
-- ==========================================
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  author_id uuid references public.users not null,
  content text,
  media_urls text[], -- Array of image/video URLs
  status text not null check (status in ('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_for timestamp with time zone,
  published_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;

-- ==========================================
-- Triggers
-- ==========================================
-- Auto-create public.users row when a new user signs up in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
  
-- Migration to add editable display_id to clients table

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS display_id text;

-- Create sequence for client IDs
CREATE SEQUENCE IF NOT EXISTS public.client_display_id_seq START 1;

-- Function to generate display_id
CREATE OR REPLACE FUNCTION public.generate_client_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'CL' || nextval('public.client_display_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run before insert
DROP TRIGGER IF EXISTS trigger_generate_client_display_id ON public.clients;
CREATE TRIGGER trigger_generate_client_display_id
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_display_id();

-- Set default display_id for existing clients
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.clients WHERE display_id IS NULL OR display_id = '' ORDER BY created_at ASC
  LOOP
    UPDATE public.clients SET display_id = 'CL' || nextval('public.client_display_id_seq') WHERE id = r.id;
  END LOOP;
END;
$$;

-- Make display_id unique (optional, but good practice)
-- Let's make it unique per workspace maybe? 
-- The user didn't specify workspace boundary, just "unique everytime".
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_display_id_key;
ALTER TABLE public.clients ADD CONSTRAINT clients_display_id_key UNIQUE (display_id);

NOTIFY pgrst, 'reload schema';

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
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS Policies to use has_permission() where necessary
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Users with delete_content permission can delete posts" ON public.posts FOR DELETE USING ( public.has_permission(workspace_id, 'delete_content') );

NOTIFY pgrst, 'reload schema';


-- Add invoice_settings to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS invoice_settings JSONB DEFAULT '{}'::jsonb;
