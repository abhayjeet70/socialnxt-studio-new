ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_note text;
