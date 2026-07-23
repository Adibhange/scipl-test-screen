-- 1. Add director_decision column to results table with new check constraint allowing nullable hire, reject, or hold decisions
ALTER TABLE public.results
ADD COLUMN director_decision text DEFAULT NULL
CONSTRAINT results_director_decision_check CHECK (director_decision IN ('hire', 'reject', 'hold') OR director_decision IS NULL);

-- 2. Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS trg_interview_round_update ON public.results;
DROP FUNCTION IF EXISTS public.handle_interview_round_update();

-- 3. Create handle_director_decision_update function
CREATE OR REPLACE FUNCTION public.handle_director_decision_update()
RETURNS TRIGGER AS $$
DECLARE
  v_candidate_id uuid;
BEGIN
  -- Resolve candidate_id from results -> exam_sessions
  SELECT candidate_id INTO v_candidate_id
  FROM public.exam_sessions
  WHERE id = NEW.id;

  IF v_candidate_id IS NOT NULL THEN
    IF NEW.director_decision = 'hire' THEN
      UPDATE public.candidates
      SET hiring_status = 'hired'
      WHERE id = v_candidate_id;
    ELSIF NEW.director_decision = 'reject' THEN
      UPDATE public.candidates
      SET hiring_status = 'rejected'
      WHERE id = v_candidate_id;
    ELSIF NEW.director_decision = 'hold' THEN
      UPDATE public.candidates
      SET hiring_status = 'on_hold'
      WHERE id = v_candidate_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger executing ONLY on update of director_decision column
CREATE TRIGGER trg_director_decision_update
  AFTER UPDATE OF director_decision ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_director_decision_update();

-- 5. Correct candidate hiring status incorrectly marked as rejected due to assessment failure
UPDATE public.candidates c
SET hiring_status = 'interviewing'
FROM public.exam_sessions e
JOIN public.results r ON r.id = e.id
WHERE e.candidate_id = c.id
  AND r.interview_rounds->'face_to_face'->>'status' = 'pass'
  AND r.interview_rounds->'assessment'->>'status' = 'fail'
  AND r.director_decision IS NULL
  AND c.hiring_status = 'rejected';
