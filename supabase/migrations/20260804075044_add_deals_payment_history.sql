-- Add payment_history to deals table: an append-only log of each payment
-- received against a revenue record, so partial/installment payments can be
-- tracked over time instead of only a single advance_paid figure.
alter table public.deals add column payment_history jsonb default '[]'::jsonb;

