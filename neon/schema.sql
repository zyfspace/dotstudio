-- ==============================================================================
-- STUDIO DASHBOARD: NEON SCHEMA
-- Same tables as supabase/schema.sql, without RLS: Neon is only reached from
-- the server (/api/data), which scopes every query to the signed-in email.
-- Run: psql "$NEON_DATABASE_URL" -f neon/schema.sql
-- ==============================================================================

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id BIGINT DEFAULT 0,
  client_name TEXT NOT NULL DEFAULT '',
  client_company TEXT DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  billing_type TEXT DEFAULT 'One-time',
  items JSONB DEFAULT '[]'::jsonb,
  start_date TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  status TEXT DEFAULT 'In Progress',
  notes TEXT DEFAULT '',
  plan JSONB DEFAULT '[]'::jsonb,
  owner_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.quotes (
  id BIGINT PRIMARY KEY,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  client_id BIGINT DEFAULT 0,
  client_name TEXT NOT NULL DEFAULT '',
  client_company TEXT DEFAULT '',
  scope JSONB DEFAULT '[]'::jsonb,
  items JSONB DEFAULT '[]'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  payment_terms TEXT DEFAULT '',
  note TEXT DEFAULT '',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  valid_until TEXT DEFAULT '',
  date TEXT DEFAULT '',
  sender_name TEXT DEFAULT '',
  sender_tagline TEXT DEFAULT '',
  sender_email TEXT DEFAULT '',
  sender_phone TEXT DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Older databases created before quotes.note existed
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- Document language ('id' default, 'en' for the English invoice / quotation)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'id';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'id';

-- 4. STUDIO PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.studio_profiles (
  email TEXT PRIMARY KEY,
  studio_name TEXT DEFAULT '',
  owner_name TEXT DEFAULT '',
  tagline TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  account_holder TEXT DEFAULT '',
  default_payment_terms TEXT DEFAULT '',
  payment_term_days INTEGER DEFAULT 7,
  default_notes TEXT DEFAULT '',
  security_pin TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invoice due date = invoice date + this many days
ALTER TABLE public.studio_profiles ADD COLUMN IF NOT EXISTS payment_term_days INTEGER DEFAULT 7;

-- CREATE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_clients_owner ON public.clients (owner_email);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects (owner_email);
CREATE INDEX IF NOT EXISTS idx_quotes_owner ON public.quotes (owner_email);
