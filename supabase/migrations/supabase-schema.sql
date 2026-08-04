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
