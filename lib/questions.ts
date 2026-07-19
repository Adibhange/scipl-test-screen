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

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapRoleAlias(role: string): string {
  const norm = normalizeStr(role);
  if (norm === "reactjsdeveloper" || norm === "reactjs" || norm === "react" || norm === "reactdeveloper") {
    return "nextjsdeveloper"; // Map ReactJS to NextJS Developer questions
  }
  if (norm === "nodejsdeveloper" || norm === "nodejs" || norm === "node" || norm === "nodejsdevelopertest") {
    return "fullstackdeveloper"; // Map NodeJS to Full Stack Developer questions
  }
  if (norm === "manualtester" || norm === "tester" || norm === "qa") {
    return "projectmanager"; // Map Tester to Project Manager questions
  }
  return norm;
}

export async function getQuestionsByRoleAndExperience(
  role: string,
  experience: string
): Promise<Question[]> {
  const all = await getAllQuestions()
  const normRole = mapRoleAlias(role)
  const normExp = normalizeStr(experience)
  return all.filter((q) => mapRoleAlias(q.role) === normRole && normalizeStr(q.experience) === normExp)
}

export async function getAssessmentQuestions(role: string, experience: string): Promise<Question[]> {
  const questions = await getQuestionsByRoleAndExperience(role, experience)
  return getAssessmentRounds(role).flatMap((round) =>
    questions.filter((question) => round.types.includes(question.type)).slice(0, round.limit),
  )
}
