-- Drop old triggers and functions if they exist
DROP TRIGGER IF EXISTS trg_director_decision_update ON public.results;
DROP FUNCTION IF EXISTS public.handle_director_decision_update();

DROP TRIGGER IF EXISTS trg_results_status_sync ON public.results;
DROP FUNCTION IF EXISTS public.handle_results_status_sync();

-- Create handle_results_status_sync function
CREATE OR REPLACE FUNCTION public.handle_results_status_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_candidate_id uuid;
  v_face_to_face_status text;
  v_new_status text;
BEGIN
  -- Resolve candidate_id from results -> exam_sessions
  SELECT candidate_id INTO v_candidate_id
  FROM public.exam_sessions
  WHERE id = NEW.id;

  IF v_candidate_id IS NOT NULL THEN
    v_face_to_face_status := NEW.interview_rounds->'face_to_face'->>'status';

    -- Priority 1: Face-to-Face FAIL
    IF v_face_to_face_status = 'fail' THEN
      v_new_status := 'rejected';
    -- Priority 2: Director Decision
    ELSIF NEW.director_decision = 'hire' THEN
      v_new_status := 'hired';
    ELSIF NEW.director_decision = 'reject' THEN
      v_new_status := 'rejected';
    ELSIF NEW.director_decision = 'hold' THEN
      v_new_status := 'on_hold';
    -- Priority 3: Active Workflow
    ELSIF v_face_to_face_status = 'pass' THEN
      v_new_status := 'interviewing';
    ELSE
      v_new_status := 'screening';
    END IF;

    -- Update candidates table
    UPDATE public.candidates
    SET hiring_status = v_new_status
    WHERE id = v_candidate_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create unified trigger executing on results updates or inserts
CREATE TRIGGER trg_results_status_sync
  AFTER INSERT OR UPDATE OF interview_rounds, director_decision ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_results_status_sync();
