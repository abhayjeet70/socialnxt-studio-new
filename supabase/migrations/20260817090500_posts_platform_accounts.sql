-- Lets a post target a specific client_socials account per platform, e.g. which of
-- the client's two Instagram accounts this post is for.
-- Shape: { "Instagram": "<client_socials.id>", "Facebook": "<client_socials.id>" }
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS platform_accounts jsonb DEFAULT '{}'::jsonb;
