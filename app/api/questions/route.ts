import { NextRequest, NextResponse } from "next/server"
import { getAssessmentQuestions, getQuestionsByRoleAndExperience } from "@/lib/questions"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role") ?? ""
  const experience = searchParams.get("experience") ?? ""
  const all = searchParams.get("all") === "1"

  const questions = all
    ? getQuestionsByRoleAndExperience(role, experience)
    : getAssessmentQuestions(role, experience)
  return NextResponse.json(questions)
}
