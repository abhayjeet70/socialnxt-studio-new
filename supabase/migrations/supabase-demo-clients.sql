-- Insert demo clients into YOUR specific workspace only
DO $$ 
DECLARE
  wid uuid;
BEGIN
  -- Find the workspace associated with your email
  SELECT workspace_id INTO wid 
  FROM public.workspace_members 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'abhayjeet5465@gmail.com' LIMIT 1)
  LIMIT 1;

  IF wid IS NOT NULL THEN
    INSERT INTO public.clients (workspace_id, name, email, industry, platforms, status)
    VALUES
      (wid, 'Sukriti Sampada', 'contact@sukriti.com', 'Education', ARRAY['Instagram', 'Facebook', 'YouTube'], 'Designing'),
      (wid, 'AAS NGO', 'info@aasngo.org', 'Non-Profit', ARRAY['Facebook', 'Instagram', 'LinkedIn'], 'Review'),
      (wid, 'Golden Brix', 'marketing@goldenbrix.com', 'Construction', ARRAY['Instagram', 'LinkedIn'], 'Planning'),
      (wid, 'Sav Zaman Boxing', 'sav@boxing.com', 'Sports & Fitness', ARRAY['Instagram', 'YouTube'], 'Published'),
      (wid, 'WebNxt', 'hello@webnxt.com', 'Technology', ARRAY['LinkedIn', 'Instagram', 'YouTube'], 'Editing'),
      (wid, 'Sunita Real Estate', 'sunita@realestate.com', 'Real Estate', ARRAY['Instagram', 'Facebook'], 'Designing'),
      (wid, 'Royal Properties', 'royal@properties.com', 'Real Estate', ARRAY['Instagram', 'Facebook', 'YouTube'], 'Completed')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Demo clients successfully added to your workspace!';
  ELSE
    RAISE NOTICE 'Could not find a workspace for this email account.';
  END IF;
END $$;
