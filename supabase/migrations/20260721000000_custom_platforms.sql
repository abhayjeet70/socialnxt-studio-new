-- Add custom_platforms JSONB array to workspaces table
alter table public.workspaces add column if not exists custom_platforms jsonb default '[]'::jsonb;
