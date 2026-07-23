import type { CandidateResult, InterviewRoundKey } from "@/types";

export const ROUND_ORDER: InterviewRoundKey[] = ["face_to_face", "assessment", "director"];

export function ensureInterviewRounds(result: CandidateResult) {
	const empty = {
		face_to_face: { status: "pending" as const },
		assessment: { status: "pending" as const },
		director: { status: "pending" as const },
	};
	return { ...empty, ...(result.interviewRounds ?? {}) };
}

export function canAccessRound(result: CandidateResult, round: InterviewRoundKey): boolean {
	const rounds = ensureInterviewRounds(result);
	if (round === "face_to_face") {
		return true;
	}
	if (round === "assessment") {
		return rounds.face_to_face.status === "pass";
	}
	if (round === "director") {
		return (
			rounds.face_to_face.status === "pass" &&
			rounds.assessment.status !== "pending"
		);
	}
	return false;
}

export function canSubmitFeedback(
	result: CandidateResult,
	round: InterviewRoundKey,
	decision?: "hire" | "reject" | "hold" | null
): boolean {
	if (!canAccessRound(result, round)) {
		return false;
	}
	if (round === "director") {
		// Director submission requires only a decision value, evaluation status is NOT required
		if (!decision || !["hire", "reject", "hold"].includes(decision)) {
			return false;
		}
	}
	return true;
}

export function getCurrentRound(result: CandidateResult): InterviewRoundKey | "completed" {
	const rounds = ensureInterviewRounds(result);
	if (rounds.face_to_face.status !== "pass") {
		return "face_to_face";
	}
	if (rounds.assessment.status === "pending") {
		return "assessment";
	}
	if (!result.directorDecision) {
		return "director";
	}
	return "completed";
}

export function calculateCandidateWorkflowStatus(
	result: CandidateResult
): "screening" | "interviewing" | "hired" | "rejected" | "on_hold" {
	const rounds = ensureInterviewRounds(result);
	
	if (rounds.face_to_face.status === "fail") {
		return "rejected";
	}
	if (result.directorDecision === "reject") {
		return "rejected";
	}
	if (result.directorDecision === "hire") {
		return "hired";
	}
	if (result.directorDecision === "hold") {
		return "on_hold";
	}
	if (rounds.face_to_face.status === "pass") {
		return "interviewing";
	}
	return "screening";
}
