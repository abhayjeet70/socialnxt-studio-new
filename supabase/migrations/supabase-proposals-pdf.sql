-- Add pdf_url column to proposals table
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- Allow anyone with access to the storage bucket to read
-- (bucket must be public or use signed URLs)

-- Create a dedicated Storage bucket for proposal PDFs (if not done already)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_pdfs', 'proposal_pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload proposal PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proposal_pdfs');

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read proposal PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposal_pdfs');

-- Allow clients to UPDATE proposal status (for approving)
CREATE POLICY "clients can approve proposals"
  ON public.proposals FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );
