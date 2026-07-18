import fs from "fs"
import path from "path"
import { getAssessmentRounds } from "@/data/assessment-rounds"
import type { Question } from "@/types"

const QUESTIONS_PATH = path.join(process.cwd(), "data", "questions.json")

export function getAllQuestions(): Question[] {
  if (!fs.existsSync(QUESTIONS_PATH)) return []
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8").trim()
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function getQuestionsByRoleAndExperience(
  role: string,
  experience: string
): Question[] {
  const all = getAllQuestions()
  return all.filter((q) => q.role === role && q.experience === experience)
}

export function getAssessmentQuestions(role: string, experience: string): Question[] {
  const questions = getQuestionsByRoleAndExperience(role, experience)
  return getAssessmentRounds(role).flatMap((round) =>
    questions.filter((question) => round.types.includes(question.type)).slice(0, round.limit),
  )
}
