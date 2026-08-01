-- Add payment_history to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;
