import { NextRequest, NextResponse } from "next/server"
import { getAssessmentQuestions, getQuestionsByRoleAndExperience } from "@/lib/questions"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role") ?? ""
    const experience = searchParams.get("experience") ?? ""
    const all = searchParams.get("all") === "1"

    const questions = all
      ? await getQuestionsByRoleAndExperience(role, experience)
      : await getAssessmentQuestions(role, experience)
    return NextResponse.json(questions)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load questions"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
