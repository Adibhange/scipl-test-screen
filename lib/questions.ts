import { getAssessmentRounds } from "@/data/assessment-rounds"
import type { Question } from "@/types"
import { getSupabaseServerClient } from "@/lib/db"

export async function getAllQuestions(): Promise<Question[]> {
  const { data, error } = await getSupabaseServerClient().from("question_documents").select("payload")

  if (error) {
    throw new Error(`Could not load questions: ${error.message}`)
  }

  return (
    (data ?? [])
      .map((row) => row.payload)
      .filter(Boolean)
      .map((payload) => payload as Question)
  )
}

export async function getQuestionsByRoleAndExperience(
  role: string,
  experience: string
): Promise<Question[]> {
  const all = await getAllQuestions()
  return all.filter((q) => q.role === role && q.experience === experience)
}

export async function getAssessmentQuestions(role: string, experience: string): Promise<Question[]> {
  const questions = await getQuestionsByRoleAndExperience(role, experience)
  return getAssessmentRounds(role).flatMap((round) =>
    questions.filter((question) => round.types.includes(question.type)).slice(0, round.limit),
  )
}
