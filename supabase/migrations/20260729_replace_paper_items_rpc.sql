-- Migration: Atomic replacement of question paper items via RPC function
-- Run this in the Supabase SQL editor.

BEGIN;

CREATE OR REPLACE FUNCTION public.replace_paper_items_rpc(
  p_paper_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_title text,
  p_total_questions integer,
  p_total_marks numeric,
  p_question_count_by_type jsonb,
  p_new_items jsonb
) RETURNS jsonb AS $$
DECLARE
  v_status text;
  v_uploaded_by uuid;
  v_referenced_count integer;
  v_item jsonb;
BEGIN
  -- 1. Lock paper row for update and retrieve details
  SELECT status, uploaded_by INTO v_status, v_uploaded_by
  FROM public.question_papers
  WHERE id = p_paper_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESTRICT_VIOLATION: Question paper not found.';
  END IF;

  -- Verify status is strictly rejected
  IF v_status <> 'rejected' THEN
    RAISE EXCEPTION 'RESTRICT_VIOLATION: Only rejected question papers can be replaced.';
  END IF;

  -- Verify ownership: actor must be HR or the owner
  IF p_actor_role <> 'hr' AND v_uploaded_by <> p_actor_id THEN
    RAISE EXCEPTION 'RESTRICT_VIOLATION: You do not have permission to replace this paper.';
  END IF;

  -- Verify not referenced by snapshots or sessions
  SELECT count(*) INTO v_referenced_count
  FROM public.candidate_assessment_snapshots
  WHERE paper_id = p_paper_id;

  IF v_referenced_count > 0 THEN
    RAISE EXCEPTION 'RESTRICT_VIOLATION: Cannot replace paper referenced by candidate snapshots.';
  END IF;

  SELECT count(*) INTO v_referenced_count
  FROM public.exam_sessions
  WHERE paper_id = p_paper_id;

  IF v_referenced_count > 0 THEN
    RAISE EXCEPTION 'RESTRICT_VIOLATION: Cannot replace paper referenced by active exam sessions.';
  END IF;

  -- 2. Delete old paper items
  DELETE FROM public.question_paper_items
  WHERE paper_id = p_paper_id;

  -- 3. Insert validated replacement items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items) LOOP
    INSERT INTO public.question_paper_items (
      paper_id, question_key, question_type, question_text, marks,
      section, code_language, expected_answer, options, sort_order
    ) VALUES (
      p_paper_id,
      v_item->>'question_key',
      v_item->>'question_type',
      v_item->>'question_text',
      (v_item->>'marks')::numeric,
      v_item->>'section',
      v_item->>'code_language',
      v_item->>'expected_answer',
      v_item->'options',
      (v_item->>'sort_order')::integer
    );
  END LOOP;

  -- 4. Update paper metadata totals, change rejected -> draft, preserve rejection reason
  UPDATE public.question_papers
  SET
    title = p_title,
    total_questions = p_total_questions,
    total_marks = p_total_marks,
    question_count_by_type = p_question_count_by_type,
    status = 'draft',
    updated_at = now()
  WHERE id = p_paper_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
