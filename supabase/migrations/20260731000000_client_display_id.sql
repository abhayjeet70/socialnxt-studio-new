-- Migration to add editable display_id to clients table

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS display_id text;

-- Create sequence for client IDs
CREATE SEQUENCE IF NOT EXISTS public.client_display_id_seq START 1;

-- Function to generate display_id
CREATE OR REPLACE FUNCTION public.generate_client_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'CL' || nextval('public.client_display_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run before insert
DROP TRIGGER IF EXISTS trigger_generate_client_display_id ON public.clients;
CREATE TRIGGER trigger_generate_client_display_id
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_display_id();

-- Set default display_id for existing clients
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.clients WHERE display_id IS NULL OR display_id = '' ORDER BY created_at ASC
  LOOP
    UPDATE public.clients SET display_id = 'CL' || nextval('public.client_display_id_seq') WHERE id = r.id;
  END LOOP;
END;
$$;

-- Make display_id unique (optional, but good practice)
-- Let's make it unique per workspace maybe? 
-- The user didn't specify workspace boundary, just "unique everytime".
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_display_id_key;
ALTER TABLE public.clients ADD CONSTRAINT clients_display_id_key UNIQUE (display_id);

NOTIFY pgrst, 'reload schema';
