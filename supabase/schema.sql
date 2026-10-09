-- ==============================================================================
-- STUDIO DASHBOARD — SUPABASE SCHEMA & POLICIES
-- Run this script in the Supabase Dashboard -> SQL Editor (or via CLI)
-- ==============================================================================

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  owner_email TEXT DEFAULT 'zyfxspace@gmail.com',
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
  owner_email TEXT DEFAULT 'zyfxspace@gmail.com',
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
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  valid_until TEXT DEFAULT '',
  date TEXT DEFAULT '',
  sender_name TEXT DEFAULT '',
  sender_tagline TEXT DEFAULT '',
  sender_email TEXT DEFAULT '',
  sender_phone TEXT DEFAULT '',
  owner_email TEXT DEFAULT 'zyfxspace@gmail.com',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
  default_notes TEXT DEFAULT '',
  security_pin TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_profiles ENABLE ROW LEVEL SECURITY;

-- DROP PREVIOUS POLICIES IF ANY TO PREVENT CONFLICTS
DROP POLICY IF EXISTS "Allow public read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public delete clients" ON public.clients;

DROP POLICY IF EXISTS "Allow public read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public delete projects" ON public.projects;

DROP POLICY IF EXISTS "Allow public read quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public delete quotes" ON public.quotes;

DROP POLICY IF EXISTS "Allow public read studio_profiles" ON public.studio_profiles;
DROP POLICY IF EXISTS "Allow public insert studio_profiles" ON public.studio_profiles;
DROP POLICY IF EXISTS "Allow public update studio_profiles" ON public.studio_profiles;
DROP POLICY IF EXISTS "Allow public delete studio_profiles" ON public.studio_profiles;

-- CREATE PERMISSIVE POLICIES FOR ANON / PUBLISHABLE KEY ACCESS
CREATE POLICY "Allow public read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Allow public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete projects" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Allow public read quotes" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Allow public insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update quotes" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete quotes" ON public.quotes FOR DELETE USING (true);

CREATE POLICY "Allow public read studio_profiles" ON public.studio_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert studio_profiles" ON public.studio_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update studio_profiles" ON public.studio_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete studio_profiles" ON public.studio_profiles FOR DELETE USING (true);

-- CREATE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_clients_owner ON public.clients (owner_email);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects (owner_email);
CREATE INDEX IF NOT EXISTS idx_quotes_owner ON public.quotes (owner_email);
