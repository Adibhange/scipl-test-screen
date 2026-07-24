-- Migration: Question Papers Feature
-- Run this in the Supabase SQL editor after the existing migrations.

BEGIN;

-- 1. Create question_papers table
CREATE TABLE IF NOT EXISTS public.question_papers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    text NOT NULL,
  role_id                  uuid NOT NULL REFERENCES public.master_roles(id),
  experience_id            uuid NOT NULL REFERENCES public.master_experiences(id),
  status                   text NOT NULL DEFAULT 'draft'
                             CHECK (status IN (
                               'draft','submitted_for_approval','rejected','published','archived'
                             )),
  uploaded_by              uuid NOT NULL REFERENCES public.admin_users(user_id) ON DELETE RESTRICT,
  uploaded_by_name         text NOT NULL,
  rejection_reason         text,
  approved_by              uuid REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  approved_by_name         text,
  approved_at              timestamptz,
  published_at             timestamptz,
  archived_at              timestamptz,
  archived_by              uuid REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  archived_by_name         text,
  total_questions          integer NOT NULL DEFAULT 0,
  total_marks              numeric NOT NULL DEFAULT 0,
  question_count_by_type   jsonb   NOT NULL DEFAULT '{}',
  version                  integer NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Enforce exactly one published paper per Role + Experience
DROP INDEX IF EXISTS question_papers_one_published_per_role_exp;
CREATE UNIQUE INDEX question_papers_one_published_per_role_exp
  ON public.question_papers (role_id, experience_id)
  WHERE status = 'published';

-- 2. Create question_paper_items table
CREATE TABLE IF NOT EXISTS public.question_paper_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id         uuid NOT NULL REFERENCES public.question_papers(id) ON DELETE CASCADE,
  question_key     text NOT NULL,
  question_type    text NOT NULL CHECK (question_type IN (
                     'mcq_single','mcq_multi','output_prediction',
                     'coding','sql','subjective'
                   )),
  question_text    text NOT NULL,
  marks            numeric NOT NULL CHECK (marks > 0),
  section          text,
  code_language    text,
  expected_answer  text,
  options          jsonb,   -- [{key, text, is_correct}] for MCQ types only
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_paper_items_paper_key_unique UNIQUE (paper_id, question_key)
);

-- 3. Create candidate_assessment_snapshots table
-- This is the immutable per-session snapshot of the candidate's assigned questions.
CREATE TABLE IF NOT EXISTS public.candidate_assessment_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  -- ON DELETE RESTRICT: a paper referenced by a snapshot cannot be deleted
  paper_id       uuid NOT NULL REFERENCES public.question_papers(id) ON DELETE RESTRICT,
  question_order jsonb NOT NULL,  -- ordered array of question_paper_items.id
  option_order   jsonb NOT NULL,  -- { [itemId]: [optionKey, ...] } per MCQ question
  -- Full copy of question_paper_items rows, stripped of is_correct/expected_answer
  -- This makes grading resilient to any future paper edits
  snapshot_items jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_assessment_snapshots_session_unique UNIQUE (session_id)
);

-- 4. Add paper_id to exam_sessions (RESTRICT prevents deleting papers in use)
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS paper_id uuid REFERENCES public.question_papers(id) ON DELETE RESTRICT;

-- 5. Enable RLS
ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_paper_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_assessment_snapshots ENABLE ROW LEVEL SECURITY;

-- 6. Full access for service_role only (no anon read — papers contain answer keys)
DROP POLICY IF EXISTS "Allow all for service_role" ON public.question_papers;
CREATE POLICY "Allow all for service_role" ON public.question_papers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.question_paper_items;
CREATE POLICY "Allow all for service_role" ON public.question_paper_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.candidate_assessment_snapshots;
CREATE POLICY "Allow all for service_role" ON public.candidate_assessment_snapshots FOR ALL USING (true) WITH CHECK (true);

COMMIT;
