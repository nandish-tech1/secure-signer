ALTER TABLE public.signature_fields
  ADD COLUMN IF NOT EXISTS field_type text NOT NULL DEFAULT 'signature',
  ADD COLUMN IF NOT EXISTS value text;