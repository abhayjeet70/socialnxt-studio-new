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
