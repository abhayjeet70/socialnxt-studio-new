-- Add client_id to media_assets if it does not exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'media_assets' 
          AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.media_assets 
        ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;
