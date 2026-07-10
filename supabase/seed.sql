-- ============================================================
-- SocialNxt Seed Data
-- Run this AFTER supabase-schema.sql in the SQL editor
-- ============================================================

-- 1. Insert a demo workspace (agency)
insert into public.workspaces (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'SocialNxt Agency');

-- 2. Seed some posts for the demo workspace
--    These don't need a real author_id yet; we'll use a placeholder.
--    Replace '00000000-0000-0000-0000-000000000099' with your real user id
--    once you sign up (find it in Supabase → Authentication → Users).

-- demo author placeholder (will be replaced once a real user exists)
-- Insert posts spanning different statuses
insert into public.posts (workspace_id, author_id, content, status, scheduled_for) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099',
   'Exciting new brand reveal! Stay tuned for the big announcement 🎉 #brandlaunch', 
   'scheduled', now() + interval '2 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099',
   'Behind the scenes of our latest campaign shoot 📸 #behindthescenes #content',
   'draft', null),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099',
   'Top 5 tips for growing your Instagram organically in 2025 👇 Thread below...',
   'pending_approval', now() + interval '5 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099',
   'Happy Diwali from the SocialNxt family! ✨🪔 Wishing you joy and success.',
   'published', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099',
   'New case study: How we grew @BrandX''s Instagram by 340% in 60 days 🚀',
   'published', now() - interval '7 days');

-- 3. Insert social account connections for the demo workspace
insert into public.social_accounts (workspace_id, platform, account_id, account_name, access_token) values
  ('00000000-0000-0000-0000-000000000001', 'instagram', 'ig_demo_123', '@socialnxt.agency', 'demo_token_ig'),
  ('00000000-0000-0000-0000-000000000001', 'facebook',  'fb_demo_456', 'SocialNxt Agency Page', 'demo_token_fb'),
  ('00000000-0000-0000-0000-000000000001', 'linkedin',  'li_demo_789', 'SocialNxt Agency', 'demo_token_li');
