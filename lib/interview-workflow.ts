import type { CandidateResult, InterviewRoundKey, InterviewRoundReview } from "@/types";

export const ROUND_ORDER: InterviewRoundKey[] = ["face_to_face", "assessment", "director"];

export function ensureInterviewRounds(result: CandidateResult) {
	const empty = {
		face_to_face: { status: "pending" as const } as InterviewRoundReview,
		assessment: { status: "pending" as const } as InterviewRoundReview,
		director: { status: "pending" as const } as InterviewRoundReview,
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
			rounds.assessment.testStatus === "finalized" &&
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
	if (round === "assessment") {
		const rounds = ensureInterviewRounds(result);
		return rounds.assessment.testStatus === "finalized";
	}
	if (round === "director") {
		// Director submission requires only a decision value, evaluation status is NOT required
		if (decision !== undefined && (!decision || !["hire", "reject", "hold"].includes(decision))) {
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

	if (result.directorDecision === "hire") {
		return "hired";
	}

	if (result.directorDecision === "reject") {
		return "rejected";
	}

	if (result.directorDecision === "hold") {
		return "on_hold";
	}

	if (rounds.face_to_face.status === "pass") {
		return "interviewing";
	}

	return "screening";
}

export function emptyInterviewRounds(): Record<InterviewRoundKey, InterviewRoundReview> {
	return {
		face_to_face: { status: "pending" as const } as InterviewRoundReview,
		assessment: { status: "pending" as const } as InterviewRoundReview,
		director: { status: "pending" as const } as InterviewRoundReview,
	};
}

export function getFirstRoundCompletionDate(result: CandidateResult): string | undefined {
	const rounds = result.interviewRounds;
	if (!rounds) return undefined;
	return rounds.face_to_face?.updatedAt;
}

export function formatCompletionDate(dateStr?: string): string {
	if (!dateStr) return "";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return "";
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	} catch {
		return "";
	}
}

export function getAssessmentLifecycle(result: CandidateResult): "not_started" | "in_progress" | "submitted" | "ready_to_finalize" | "finalized" {
	const rounds = ensureInterviewRounds(result);
	if (rounds.assessment.testStatus === "finalized") {
		return "finalized";
	}

	if (!result.isExamStarted) {
		return "not_started";
	}

	if (result.isExamStarted && !result.isExamSubmitted) {
		return "in_progress";
	}

	// Exam is submitted. Let's check if all manual questions are graded.
	const manualAnswers = (result.answers || []).filter(
		ans => ans.questionType === "coding" || ans.questionType === "sql" || ans.questionType === "subjective"
	);

	const allGraded = manualAnswers.every(
		ans => ans.adminGrade === "correct" || ans.adminGrade === "partial" || ans.adminGrade === "incorrect"
	);

	if (allGraded) {
		return "ready_to_finalize";
	}

	return "submitted";
}
