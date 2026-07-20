import type { CandidateResult } from "@/types"
import { getSupabaseServerClient } from "@/lib/db"

export async function getAllResults(): Promise<CandidateResult[]> {
  const supabase = getSupabaseServerClient();

  // 1. Fetch all results
  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select("*");

  if (resultsError) throw new Error(`Could not load results: ${resultsError.message}`);
  if (!results || results.length === 0) return [];

  const sessionIds = results.map(r => r.id);

  // 2. Fetch all exam sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from("exam_sessions")
    .select("*")
    .in("id", sessionIds);

  if (sessionsError) throw new Error("Could not load exam sessions");
  const sessionMap = new Map(sessions.map(s => [s.id, s]));

  const candidateIds = sessions.map(s => s.candidate_id);

  // 3. Fetch all candidates
  const { data: candidates, error: candidatesError } = await supabase
    .from("candidates")
    .select(`
      id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, vacancy_id,
      role:master_roles(value, label),
      experience:master_experiences(value, label),
      test_location:master_test_locations(value, label),
      hiring_location:master_hiring_locations(value, label)
    `)
    .in("id", candidateIds);

  if (candidatesError) throw new Error("Could not load candidates");
  const candidateMap = new Map(candidates.map(c => [c.id, c]));

  // 4. Fetch all candidate answers
  const { data: allAnswers, error: answersError } = await supabase
    .from("candidate_answers")
    .select("*")
    .in("exam_session_id", sessionIds);

  if (answersError) throw new Error("Could not load candidate answers");
  
  const answersBySession = new Map<string, any[]>();
  allAnswers.forEach(ans => {
    const list = answersBySession.get(ans.exam_session_id) || [];
    list.push(ans);
    answersBySession.set(ans.exam_session_id, list);
  });

  // 5. Fetch tab switches count by counting proctoring logs grouped by exam_session_id
  const { data: logs, error: logsError } = await supabase
    .from("proctoring_logs")
    .select("exam_session_id")
    .eq("violation_type", "tab_switch")
    .in("exam_session_id", sessionIds);

  if (logsError) throw new Error("Could not load proctoring logs");
  
  const tabSwitchesBySession = new Map<string, number>();
  logs.forEach(log => {
    tabSwitchesBySession.set(log.exam_session_id, (tabSwitchesBySession.get(log.exam_session_id) || 0) + 1);
  });

  // Construct results list
  return results.map(resultRow => {
    const session = sessionMap.get(resultRow.id);
    const candidateRow = session ? candidateMap.get(session.candidate_id) : undefined;
    const answerRows = answersBySession.get(resultRow.id) || [];
    const count = tabSwitchesBySession.get(resultRow.id) || 0;

    const roleObj = candidateRow ? (candidateRow as any).role : undefined;
    const experienceObj = candidateRow ? (candidateRow as any).experience : undefined;
    const testLocObj = candidateRow ? (candidateRow as any).test_location : undefined;
    const hiringLocObj = candidateRow ? (candidateRow as any).hiring_location : undefined;

    return {
      id: resultRow.id,
      candidate: {
        id: candidateRow?.id || "",
        name: `${candidateRow?.first_name || ""} ${candidateRow?.last_name || ""}`.trim(),
        mobile: candidateRow?.mobile || "",
        email: candidateRow?.email || "",
        role: roleObj?.value || "",
        experience: experienceObj?.value || "",
        testLocation: testLocObj?.value || "home",
        hiringLocation: hiringLocObj?.value || undefined,
        hiringStatus: candidateRow?.hiring_status as any,
        expectedSalary: candidateRow?.expected_salary == null ? undefined : Number(candidateRow.expected_salary),
        offerSalary: candidateRow?.offer_salary == null ? undefined : Number(candidateRow.offer_salary),
        hrNotes: candidateRow?.hr_notes ?? undefined,
        vacancyId: candidateRow?.vacancy_id || undefined,
      },
      answers: answerRows.map(ans => ({
        questionId: ans.question_id,
        questionTopic: ans.question_topic,
        questionType: ans.question_type,
        answerValue: ans.answer_value,
        isCorrect: ans.is_correct ?? undefined,
        adminGrade: ans.admin_grade ?? undefined,
        marksAwarded: ans.marks_awarded != null ? Number(ans.marks_awarded) : undefined,
      })),
      tabSwitches: count,
      secondsUsed: resultRow.seconds_used,
      submittedAt: resultRow.submitted_at,
      totalMarksAwarded: resultRow.total_marks_awarded != null ? Number(resultRow.total_marks_awarded) : undefined,
      totalMarksPossible: resultRow.total_marks_possible != null ? Number(resultRow.total_marks_possible) : undefined,
      scoreBreakdown: resultRow.score_breakdown ?? undefined,
      interviewRounds: resultRow.interview_rounds ?? undefined,
      assignedInterviewerId: resultRow.assigned_interviewer_id ?? undefined,
      assignedInterviewerName: resultRow.assigned_interviewer_name ?? undefined,
      assignedInterviewerEmail: resultRow.assigned_interviewer_email ?? undefined,
    };
  });
}

export async function getResultById(id: string): Promise<CandidateResult | undefined> {
  const supabase = getSupabaseServerClient();
  
  // 1. Fetch from results table
  const { data: resultRow, error: resultError } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (resultError) throw new Error(`Could not load result: ${resultError.message}`);
  if (!resultRow) return undefined;

  // 2. Fetch from exam_sessions table
  const { data: sessionRow, error: sessionError } = await supabase
    .from("exam_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (sessionError || !sessionRow) throw new Error("Could not find exam session for result");

  // 3. Fetch from candidates table, joining master tables to get strings
  const { data: candidateRow, error: candidateError } = await supabase
    .from("candidates")
    .select(`
      id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, vacancy_id,
      role:master_roles(value, label),
      experience:master_experiences(value, label),
      test_location:master_test_locations(value, label),
      hiring_location:master_hiring_locations(value, label)
    `)
    .eq("id", sessionRow.candidate_id)
    .maybeSingle();

  if (candidateError || !candidateRow) throw new Error("Could not find candidate for exam session");

  // 4. Fetch candidate answers
  const { data: answerRows, error: answersError } = await supabase
    .from("candidate_answers")
    .select("*")
    .eq("exam_session_id", id);

  if (answersError) throw new Error("Could not load candidate answers");

  // 5. Fetch proctoring logs count for tab_switch
  const { count, error: logsError } = await supabase
    .from("proctoring_logs")
    .select("*", { count: "exact", head: true })
    .eq("exam_session_id", id)
    .eq("violation_type", "tab_switch");

  if (logsError) throw new Error("Could not load proctoring logs");

  const roleObj = (candidateRow as any).role;
  const experienceObj = (candidateRow as any).experience;
  const testLocObj = (candidateRow as any).test_location;
  const hiringLocObj = (candidateRow as any).hiring_location;

  return {
    id: resultRow.id,
    candidate: {
      id: candidateRow.id,
      name: `${candidateRow.first_name} ${candidateRow.last_name}`.trim(),
      mobile: candidateRow.mobile,
      email: candidateRow.email,
      role: roleObj?.value || "",
      experience: experienceObj?.value || "",
      testLocation: testLocObj?.value || "home",
      hiringLocation: hiringLocObj?.value || undefined,
      hiringStatus: candidateRow.hiring_status as any,
      expectedSalary: candidateRow.expected_salary == null ? undefined : Number(candidateRow.expected_salary),
      offerSalary: candidateRow.offer_salary == null ? undefined : Number(candidateRow.offer_salary),
      hrNotes: candidateRow.hr_notes ?? undefined,
      vacancyId: candidateRow.vacancy_id || undefined,
    },
    answers: (answerRows || []).map(ans => ({
      questionId: ans.question_id,
      questionTopic: ans.question_topic,
      questionType: ans.question_type,
      answerValue: ans.answer_value,
      isCorrect: ans.is_correct ?? undefined,
      adminGrade: ans.admin_grade ?? undefined,
      marksAwarded: ans.marks_awarded != null ? Number(ans.marks_awarded) : undefined,
    })),
    tabSwitches: count || 0,
    secondsUsed: resultRow.seconds_used,
    submittedAt: resultRow.submitted_at,
    totalMarksAwarded: resultRow.total_marks_awarded != null ? Number(resultRow.total_marks_awarded) : undefined,
    totalMarksPossible: resultRow.total_marks_possible != null ? Number(resultRow.total_marks_possible) : undefined,
    scoreBreakdown: resultRow.score_breakdown ?? undefined,
    interviewRounds: resultRow.interview_rounds ?? undefined,
    assignedInterviewerId: resultRow.assigned_interviewer_id ?? undefined,
    assignedInterviewerName: resultRow.assigned_interviewer_name ?? undefined,
    assignedInterviewerEmail: resultRow.assigned_interviewer_email ?? undefined,
  };
}

export async function saveResult(result: CandidateResult): Promise<void> {
  const supabase = getSupabaseServerClient();

  // Save/upsert the results table row
  const { error: resultError } = await supabase.from("results").upsert(
    {
      id: result.id, // which is exam_session_id
      seconds_used: result.secondsUsed,
      submitted_at: result.submittedAt,
      total_marks_awarded: result.totalMarksAwarded ?? null,
      total_marks_possible: result.totalMarksPossible ?? null,
      score_breakdown: result.scoreBreakdown ?? null,
      interview_rounds: result.interviewRounds ?? null,
      assigned_interviewer_id: result.assignedInterviewerId ?? null,
      assigned_interviewer_name: result.assignedInterviewerName ?? null,
      assigned_interviewer_email: result.assignedInterviewerEmail ?? null,
    },
    { onConflict: "id" }
  );

  if (resultError) throw new Error(`Could not save result row: ${resultError.message}`);

  // Save individual answers to candidate_answers table
  if (result.answers && result.answers.length > 0) {
    const answersData = result.answers.map(ans => ({
      exam_session_id: result.id,
      question_id: ans.questionId,
      question_topic: ans.questionTopic,
      question_type: ans.questionType,
      answer_value: ans.answerValue,
      is_correct: ans.isCorrect ?? null,
      admin_grade: ans.adminGrade ?? null,
      marks_awarded: ans.marksAwarded ?? 0,
    }));

    const { error: answersError } = await supabase.from("candidate_answers").upsert(
      answersData,
      { onConflict: "exam_session_id,question_id" }
    );

    if (answersError) throw new Error(`Could not save candidate answers: ${answersError.message}`);
  }
}

export async function updateResult(
  id: string,
  updater: (result: CandidateResult) => CandidateResult,
): Promise<CandidateResult | undefined> {
  const existing = await getResultById(id)
  if (!existing) return undefined

  const updated = updater(existing)
  await saveResult(updated)
  return updated
}
