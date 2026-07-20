-- PostgreSQL Migration Script: Cascade Deletions & RLS Schema Verification
-- Run this in the Supabase SQL Editor to enforce strict relational hygiene

BEGIN;

-- 1. DATA HYGIENE PURGE (ORPHAN CLEANUP)
-- Purge any orphaned records before modifying constraints to avoid validation checks breaking the transaction
DELETE FROM public.candidate_answers WHERE exam_session_id NOT IN (SELECT id FROM public.exam_sessions);
DELETE FROM public.proctoring_logs WHERE exam_session_id NOT IN (SELECT id FROM public.exam_sessions);
DELETE FROM public.results WHERE id NOT IN (SELECT id FROM public.exam_sessions);
DELETE FROM public.exam_sessions WHERE candidate_id NOT IN (SELECT id FROM public.candidates);

-- 2. FORCE CANDIDATE TO EXAM SESSION CASCADE
-- Drop existing foreign key constraint on exam_sessions.candidate_id if present
ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_candidate_id_fkey;

-- Re-add constraint explicitly with ON DELETE CASCADE
ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_candidate_id_fkey 
  FOREIGN KEY (candidate_id) 
  REFERENCES public.candidates(id) 
  ON DELETE CASCADE;

-- 3. EXAM SESSION TO RESULTS CASCADE
-- Drop and re-add foreign key on results (id references exam_sessions.id)
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_id_fkey;
ALTER TABLE public.results
  ADD CONSTRAINT results_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES public.exam_sessions(id) 
  ON DELETE CASCADE;

-- 4. EXAM SESSION TO PROCTORING LOGS CASCADE
-- Drop and re-add foreign key on proctoring_logs (exam_session_id references exam_sessions.id)
ALTER TABLE public.proctoring_logs DROP CONSTRAINT IF EXISTS proctoring_logs_exam_session_id_fkey;
ALTER TABLE public.proctoring_logs
  ADD CONSTRAINT proctoring_logs_exam_session_id_fkey 
  FOREIGN KEY (exam_session_id) 
  REFERENCES public.exam_sessions(id) 
  ON DELETE CASCADE;

-- 5. EXAM SESSION TO CANDIDATE ANSWERS CASCADE
-- Drop and re-add foreign key on candidate_answers (exam_session_id references exam_sessions.id)
ALTER TABLE public.candidate_answers DROP CONSTRAINT IF EXISTS candidate_answers_exam_session_id_fkey;
ALTER TABLE public.candidate_answers
  ADD CONSTRAINT candidate_answers_exam_session_id_fkey 
  FOREIGN KEY (exam_session_id) 
  REFERENCES public.exam_sessions(id) 
  ON DELETE CASCADE;

COMMIT;
