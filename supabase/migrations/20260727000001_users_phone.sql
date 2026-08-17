-- Add phone column to public.users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone text;
