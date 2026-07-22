-- PostgreSQL Migration Script: Add Candidate Experiences, References, and Employees tables
-- Run this in the Supabase SQL Editor / Migration Pipeline

BEGIN;

-- 1. Create employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create candidate_experiences Table
CREATE TABLE IF NOT EXISTS public.candidate_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  designation text NOT NULL,
  joining_date timestamptz NOT NULL,
  leaving_date timestamptz,
  salary numeric,
  notice_period integer NOT NULL DEFAULT 0,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create candidate_references Table
CREATE TABLE IF NOT EXISTS public.candidate_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  reference_type text NOT NULL CHECK (reference_type IN ('INTERNAL', 'EXTERNAL')),
  reference_name text NOT NULL,
  reference_mobile text NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  verified_by text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_mobile ON public.candidates(mobile);
CREATE INDEX IF NOT EXISTS idx_candidate_experiences_candidate ON public.candidate_experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_references_candidate ON public.candidate_references(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_references_employee ON public.candidate_references(employee_id);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_references ENABLE ROW LEVEL SECURITY;

-- 6. Setup default full access policies for server operations using service_role
DROP POLICY IF EXISTS "Allow all for service_role" ON public.employees;
CREATE POLICY "Allow all for service_role" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.candidate_experiences;
CREATE POLICY "Allow all for service_role" ON public.candidate_experiences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.candidate_references;
CREATE POLICY "Allow all for service_role" ON public.candidate_references FOR ALL USING (true) WITH CHECK (true);

COMMIT;
