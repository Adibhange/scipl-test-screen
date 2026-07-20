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
  try {
    // Enforce structured, type-safe filtering validation constraints against candidate context
    if (!role?.trim()) {
      throw new Error("Active candidate context role constraint is missing or invalid");
    }
    if (!experience?.trim()) {
      throw new Error("Active candidate context experience constraint is missing or invalid");
    }

    const all = await getAllQuestions();
    const normRole = mapRoleAlias(role);
    const normExp = normalizeStr(experience);

    // Filter with strict conditional tracking matching role and experience keys exactly
    const matched = all.filter((q) => {
      const qRole = q.role;
      const qExp = q.experience;
      if (!qRole || !qExp) return false;
      return mapRoleAlias(qRole) === normRole && normalizeStr(qExp) === normExp;
    });

    return matched;
  } catch (err: any) {
    console.warn("getQuestionsByRoleAndExperience fallback warning:", err.message || err);
    throw err;
  }
}

export async function getAssessmentQuestions(role: string, experience: string): Promise<Question[]> {
  try {
    const questions = await getQuestionsByRoleAndExperience(role, experience)
    
    if (questions.length === 0) {
      throw new Error(`No assessment questions are configured for the "${role}" role with "${experience}" years of experience. Please contact HR to assign questions.`);
    }

    const rounds = getAssessmentRounds(role);
    if (rounds.length === 0) {
      throw new Error(`No assessment rounds are configured for the "${role}" role. Please contact HR.`);
    }

    const matchedQuestions = rounds.flatMap((round) =>
      questions.filter((question) => round.types.includes(question.type)).slice(0, round.limit)
    );

    if (matchedQuestions.length === 0) {
      throw new Error(`Questions are configured, but none match the round structure for the "${role}" role. Please contact HR.`);
    }

    return matchedQuestions;
  } catch (err: any) {
    console.warn("getAssessmentQuestions fallback warning:", err.message || err);
    throw err;
  }
}
