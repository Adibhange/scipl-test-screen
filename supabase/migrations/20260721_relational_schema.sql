-- PostgreSQL Migration Script: Relational Database Schema Migration & Optimization Pass
-- Run this in the Supabase SQL Editor

BEGIN;

-- Drop dependent tables first to clear foreign key dependencies
DROP TABLE IF EXISTS public.results CASCADE;
DROP TABLE IF EXISTS public.proctoring_logs CASCADE;
DROP TABLE IF EXISTS public.candidate_answers CASCADE;
DROP TABLE IF EXISTS public.job_vacancies CASCADE;

-- Empty all existing candidate data and exam sessions to prevent foreign key / constraint errors
TRUNCATE TABLE public.candidates CASCADE;
TRUNCATE TABLE public.exam_sessions CASCADE;

-- 1. Create normalized job_vacancies Table
CREATE TABLE public.job_vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role uuid NOT NULL REFERENCES public.master_roles(id),
  experience uuid NOT NULL REFERENCES public.master_experiences(id),
  hiring_location uuid NOT NULL REFERENCES public.master_hiring_locations(id),
  test_locations text[] NOT NULL DEFAULT '{}',
  openings integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_vacancies_role_experience_hiring_key UNIQUE (role, experience, hiring_location)
);

-- 2. Candidates Table Conversion
-- Drop old columns and recreate them as UUID foreign keys / split names
ALTER TABLE public.candidates DROP COLUMN IF EXISTS role;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS experience;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS test_location;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS hiring_location;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS name;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS vacancy_id;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS last_name;

ALTER TABLE public.candidates ADD COLUMN first_name text NOT NULL;
ALTER TABLE public.candidates ADD COLUMN last_name text NOT NULL;
ALTER TABLE public.candidates ADD COLUMN role uuid NOT NULL REFERENCES public.master_roles(id);
ALTER TABLE public.candidates ADD COLUMN experience uuid REFERENCES public.master_experiences(id);
ALTER TABLE public.candidates ADD COLUMN test_location uuid NOT NULL REFERENCES public.master_test_locations(id);
ALTER TABLE public.candidates ADD COLUMN hiring_location uuid REFERENCES public.master_hiring_locations(id);
ALTER TABLE public.candidates ADD COLUMN vacancy_id uuid REFERENCES public.job_vacancies(id) ON DELETE SET NULL;

-- Drop and recreate composite unique constraint on email, role, and experience
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_email_role_experience_key;
ALTER TABLE public.candidates ADD CONSTRAINT candidates_email_role_experience_key UNIQUE (email, role, experience);

-- 3. Refactor exam_sessions Table
-- Drop existing constraint and column to avoid column duplicate errors
ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_pkey;
ALTER TABLE public.exam_sessions DROP COLUMN IF EXISTS id;
-- Add a single UUID id primary key
ALTER TABLE public.exam_sessions ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
-- Add unique constraint on candidate_id
ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_candidate_id_key;
ALTER TABLE public.exam_sessions ADD CONSTRAINT exam_sessions_candidate_id_key UNIQUE (candidate_id);

-- Drop old columns and add UUID foreign keys / boolean types
ALTER TABLE public.exam_sessions DROP COLUMN IF EXISTS role;
ALTER TABLE public.exam_sessions DROP COLUMN IF EXISTS experience;
ALTER TABLE public.exam_sessions DROP COLUMN IF EXISTS is_exam_started;
ALTER TABLE public.exam_sessions DROP COLUMN IF EXISTS is_exam_submitted;

ALTER TABLE public.exam_sessions ADD COLUMN role uuid NOT NULL REFERENCES public.master_roles(id);
ALTER TABLE public.exam_sessions ADD COLUMN experience uuid REFERENCES public.master_experiences(id);
ALTER TABLE public.exam_sessions ADD COLUMN is_exam_started boolean NOT NULL DEFAULT false;
ALTER TABLE public.exam_sessions ADD COLUMN is_exam_submitted boolean NOT NULL DEFAULT false;

-- 4. Create results Table
CREATE TABLE public.results (
  id uuid PRIMARY KEY REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  seconds_used integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  total_marks_awarded numeric,
  total_marks_possible numeric,
  score_breakdown jsonb,
  interview_rounds jsonb,
  assigned_interviewer_id uuid REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  assigned_interviewer_name text,
  assigned_interviewer_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create proctoring_logs Table
CREATE TABLE public.proctoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  violation_type text NOT NULL DEFAULT 'tab_switch',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Create candidate_answers Table
CREATE TABLE public.candidate_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_topic text NOT NULL,
  question_type text NOT NULL,
  answer_value jsonb NOT NULL,
  is_correct boolean,
  admin_grade text CHECK (admin_grade IN ('correct', 'partial', 'incorrect')),
  marks_awarded numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_answers_session_question_key UNIQUE (exam_session_id, question_id)
);

-- 7. Automated Vacancy Closure Trigger & Function
CREATE OR REPLACE FUNCTION public.handle_candidate_hired()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger executes only if transitioning to 'hired' state from another status
  IF NEW.hiring_status = 'hired' AND (OLD IS NULL OR OLD.hiring_status IS DISTINCT FROM 'hired') THEN
    IF NEW.vacancy_id IS NOT NULL THEN
      -- Decrement openings by 1
      UPDATE public.job_vacancies
      SET openings = openings - 1
      WHERE id = NEW.vacancy_id;

      -- Deactivate vacancy if openings reach 0 or less
      UPDATE public.job_vacancies
      SET is_active = false
      WHERE id = NEW.vacancy_id AND openings <= 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_hired ON public.candidates;
CREATE TRIGGER trg_candidate_hired
  AFTER INSERT OR UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_candidate_hired();

-- 8. Automated Round-Advancement Hiring Status Trigger
CREATE OR REPLACE FUNCTION public.handle_interview_round_update()
RETURNS TRIGGER AS $$
DECLARE
  v_candidate_id uuid;
  v_face_to_face_status text;
  v_assessment_status text;
  v_director_status text;
  v_new_status text;
BEGIN
  -- Resolve the candidate ID from results -> exam_sessions
  SELECT candidate_id INTO v_candidate_id
  FROM public.exam_sessions
  WHERE id = NEW.id;

  IF v_candidate_id IS NOT NULL THEN
    v_face_to_face_status := NEW.interview_rounds->'face_to_face'->>'status';
    v_assessment_status := NEW.interview_rounds->'assessment'->>'status';
    v_director_status := NEW.interview_rounds->'director'->>'status';

    -- Determine new global hiring status based on round progression
    IF v_face_to_face_status = 'fail' OR v_assessment_status = 'fail' OR v_director_status = 'fail' THEN
      v_new_status := 'rejected';
    ELSIF v_director_status = 'pass' THEN
      v_new_status := 'hired';
    ELSIF v_assessment_status = 'pass' OR v_face_to_face_status = 'pass' THEN
      v_new_status := 'interviewing';
    ELSE
      v_new_status := 'screening';
    END IF;

    -- Update the candidate's hiring_status dynamically
    UPDATE public.candidates
    SET hiring_status = v_new_status
    WHERE id = v_candidate_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_interview_round_update ON public.results;
CREATE TRIGGER trg_interview_round_update
  AFTER INSERT OR UPDATE OF interview_rounds ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_interview_round_update();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_vacancies ENABLE ROW LEVEL SECURITY;

-- Setup default full access policies for server operations using service_role
DROP POLICY IF EXISTS "Allow all for service_role" ON public.results;
CREATE POLICY "Allow all for service_role" ON public.results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.proctoring_logs;
CREATE POLICY "Allow all for service_role" ON public.proctoring_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.candidate_answers;
CREATE POLICY "Allow all for service_role" ON public.candidate_answers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for service_role" ON public.job_vacancies;
CREATE POLICY "Allow all for service_role" ON public.job_vacancies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read" ON public.job_vacancies;
CREATE POLICY "Allow anon read" ON public.job_vacancies FOR SELECT USING (true);

COMMIT;
