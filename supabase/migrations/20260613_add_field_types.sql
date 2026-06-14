-- Add field types to signature_fields
DO $$ BEGIN
  CREATE TYPE public.field_type AS ENUM ('signature', 'name', 'date', 'company_stamp', 'initials', 'checkbox', 'text');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.signature_fields
  ADD COLUMN IF NOT EXISTS field_type public.field_type NOT NULL DEFAULT 'signature';

-- Add label column for custom field labels
ALTER TABLE public.signature_fields
  ADD COLUMN IF NOT EXISTS label text DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
