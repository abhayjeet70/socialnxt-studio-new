-- Add platform column to media_assets
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'media_assets' 
          AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.media_assets 
        ADD COLUMN platform text;
    END IF;
END $$;

-- Notify postgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
