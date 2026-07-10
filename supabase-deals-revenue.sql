-- Add advance_paid to deals table
ALTER TABLE public.deals ADD COLUMN advance_paid numeric(10,2) DEFAULT 0;
