import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/db"
import { getAllQuestions } from "@/lib/questions"
import { getResultById } from "@/lib/results"
import type { AdminGrade } from "@/types"

const validGrades: AdminGrade[] = ["correct", "partial", "incorrect"]

export async function POST(request: NextRequest) {
  const body: { resultId?: string; questionId?: string; grade?: AdminGrade } =
    await request.json()

  if (
    !body.resultId ||
    !body.questionId ||
    !body.grade ||
    !validGrades.includes(body.grade)
  ) {
    return NextResponse.json({ error: "Invalid grading request" }, { status: 400 })
  }

  const supabase = getSupabaseServerClient();

  // Verify candidate answer exists
  const { data: answerRow, error: checkError } = await supabase
    .from("candidate_answers")
    .select("id")
    .eq("exam_session_id", body.resultId)
    .eq("question_id", body.questionId)
    .maybeSingle();

  if (checkError || !answerRow) {
    return NextResponse.json({ error: "Candidate answer not found" }, { status: 404 })
  }

  // Lookup the question details to find maximum possible marks
  const questions = await getAllQuestions();
  const question = questions.find((q) => q.id === body.questionId);
  const maxMarks = question ? question.marks : 0;

  // Calculate marks awarded based on grade
  const marksAwarded =
    body.grade === "correct" ? maxMarks
    : body.grade === "partial" ? maxMarks / 2
    : 0;

  // Mutate candidate answer directly
  const { error: updateError } = await supabase
    .from("candidate_answers")
    .update({
      admin_grade: body.grade,
      marks_awarded: marksAwarded,
    })
    .eq("exam_session_id", body.resultId)
    .eq("question_id", body.questionId);

  if (updateError) {
    return NextResponse.json({ error: `Could not grade answer: ${updateError.message}` }, { status: 500 })
  }

  // Reset finalized total score fields in results table so they can be re-resolved
  await supabase
    .from("results")
    .update({
      total_marks_awarded: null,
      total_marks_possible: null,
      score_breakdown: null,
    })
    .eq("id", body.resultId);

  // Return the newly updated CandidateResult representation
  const updatedResult = await getResultById(body.resultId);
  if (!updatedResult) {
    return NextResponse.json({ error: "Failed to reload updated result" }, { status: 500 })
  }

  return NextResponse.json(updatedResult)
}
