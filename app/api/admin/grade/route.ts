import { NextRequest, NextResponse } from "next/server"
import { getResultById, updateResult } from "@/lib/results"
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

  const result = await getResultById(body.resultId)
  if (!result || !result.answers.some((answer) => answer.questionId === body.questionId)) {
    return NextResponse.json({ error: "Result or question not found" }, { status: 404 })
  }

  const updated = await updateResult(body.resultId, (currentResult) => ({
    ...currentResult,
    answers: currentResult.answers.map((answer) =>
      answer.questionId === body.questionId
        ? { ...answer, adminGrade: body.grade }
        : answer,
    ),
    totalMarksAwarded: undefined,
    totalMarksPossible: undefined,
  }))

  if (!updated) return NextResponse.json({ error: "Result not found" }, { status: 404 })
  return NextResponse.json(updated)
}
