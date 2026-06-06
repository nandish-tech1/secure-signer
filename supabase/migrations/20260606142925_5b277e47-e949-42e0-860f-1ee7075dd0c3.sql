
-- Document Signature App schema
-- Status enums
CREATE TYPE public.document_status AS ENUM ('draft', 'sent', 'completed', 'cancelled');
CREATE TYPE public.signer_status AS ENUM ('pending', 'signed', 'rejected');

-- Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  original_path text NOT NULL,
  signed_path text,
  page_count integer NOT NULL DEFAULT 1,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_owner ON public.documents(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read documents" ON public.documents
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners insert documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update documents" ON public.documents
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners delete documents" ON public.documents
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Signers table (one per intended recipient/signature)
CREATE TABLE public.signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  token text NOT NULL UNIQUE,
  status public.signer_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  signed_at timestamptz,
  signed_ip text,
  signature_data text, -- base64 signature image data URL
  signature_typed text, -- typed name fallback
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_signers_document ON public.signers(document_id);
CREATE INDEX idx_signers_token ON public.signers(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signers TO authenticated;
GRANT ALL ON public.signers TO service_role;
ALTER TABLE public.signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage signers" ON public.signers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = signers.document_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = signers.document_id AND d.owner_id = auth.uid()));

-- Signature field placements (coordinates relative to page in 0..1 normalized space)
CREATE TABLE public.signature_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id uuid NOT NULL REFERENCES public.signers(id) ON DELETE CASCADE,
  page integer NOT NULL DEFAULT 1,
  x_ratio numeric NOT NULL,
  y_ratio numeric NOT NULL,
  width_ratio numeric NOT NULL DEFAULT 0.2,
  height_ratio numeric NOT NULL DEFAULT 0.06,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fields_signer ON public.signature_fields(signer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_fields TO authenticated;
GRANT ALL ON public.signature_fields TO service_role;
ALTER TABLE public.signature_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage fields" ON public.signature_fields
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.signers s
    JOIN public.documents d ON d.id = s.document_id
    WHERE s.id = signature_fields.signer_id AND d.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.signers s
    JOIN public.documents d ON d.id = s.document_id
    WHERE s.id = signature_fields.signer_id AND d.owner_id = auth.uid()
  ));

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.signers(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_document ON public.audit_logs(document_id);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = audit_logs.document_id AND d.owner_id = auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER documents_touch BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for 'documents' bucket
-- Owners can read/write within their own folder (owner_id/...).
-- Anyone with the signer token can read via server (service_role bypasses RLS).
CREATE POLICY "Owners read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
