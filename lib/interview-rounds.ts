import type { CandidateResult, InterviewRoundKey, InterviewRoundReview } from "@/types"

export const ROUND_ORDER: InterviewRoundKey[] = ["face_to_face", "assessment", "director"]

export function emptyInterviewRounds(): Record<InterviewRoundKey, InterviewRoundReview> {
  return {
    face_to_face: { status: "pending" },
    assessment: { status: "pending" },
    director: { status: "pending" },
  }
}

export function ensureInterviewRounds(result: CandidateResult) {
  return { ...emptyInterviewRounds(), ...(result.interviewRounds ?? {}) }
}

export function canEnterRound(result: CandidateResult, round: InterviewRoundKey) {
  if (round === "face_to_face") return true
  const index = ROUND_ORDER.indexOf(round)
  return ensureInterviewRounds(result)[ROUND_ORDER[index - 1]].status === "pass"
}
