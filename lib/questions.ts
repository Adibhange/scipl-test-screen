import fs from "fs"
import path from "path"
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
  const mcq = questions.filter(
    (question) =>
      question.type === "mcq_single" ||
      question.type === "mcq_multi" ||
      question.type === "output_prediction",
  )
  const coding = questions.filter(
    (question) => question.type === "coding" || question.type === "sql",
  )
  const subjective = questions.filter((question) => question.type === "subjective")

  return [...mcq.slice(0, 20), ...coding.slice(0, 5), ...subjective.slice(0, 3)]
}
