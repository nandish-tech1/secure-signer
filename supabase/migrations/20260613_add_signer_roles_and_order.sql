-- Add signer roles and signing order support
ALTER TABLE public.signers ADD COLUMN IF NOT EXISTS role text DEFAULT 'signer';
ALTER TABLE public.signers ADD COLUMN IF NOT EXISTS order_index integer;
ALTER TABLE public.signers ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Add signing mode to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signing_mode text DEFAULT 'parallel';

-- Add expiration to signers
ALTER TABLE public.signers ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Create enum for roles if not exists
DO $$ BEGIN
  CREATE TYPE signer_role AS ENUM ('signer', 'validator', 'witness');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Update role column to use enum
ALTER TABLE public.signers ALTER COLUMN role TYPE signer_role USING role::signer_role;
ALTER TABLE public.signers ALTER COLUMN role SET DEFAULT 'signer'::signer_role;

-- Update signing_mode to use enum
DO $$ BEGIN
  CREATE TYPE signing_mode_type AS ENUM ('ordered', 'parallel');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.documents ALTER COLUMN signing_mode TYPE signing_mode_type USING signing_mode::signing_mode_type;
ALTER TABLE public.documents ALTER COLUMN signing_mode SET DEFAULT 'parallel'::signing_mode_type;
