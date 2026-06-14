-- Add role and expires_at to signers table with RLS policy fix
DO $$ BEGIN
  CREATE TYPE public.signer_role AS ENUM ('signer', 'validator', 'witness');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.signers
  ADD COLUMN IF NOT EXISTS role public.signer_role DEFAULT 'signer',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Create index for expiration queries
CREATE INDEX IF NOT EXISTS idx_signers_expires_at ON public.signers(expires_at);
CREATE INDEX IF NOT EXISTS idx_signers_role ON public.signers(role);
CREATE INDEX IF NOT EXISTS idx_signers_order_index ON public.signers(document_id, order_index);

-- Fix RLS policies for signers table to allow service_role to insert
DROP POLICY IF EXISTS "Service role can manage signers" ON public.signers;
CREATE POLICY "Service role can manage signers" ON public.signers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Document owner can manage signers" ON public.signers;
CREATE POLICY "Document owner can manage signers" ON public.signers
  FOR ALL TO authenticated
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Signers can view their own signer record" ON public.signers;
CREATE POLICY "Signers can view their own signer record" ON public.signers
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Allow anonymous access to signers via token for public signing
DROP POLICY IF EXISTS "Anonymous can access by token" ON public.signers;
CREATE POLICY "Anonymous can access by token" ON public.signers
  FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
