import { apiRequest } from "@/lib/api-client";
import type { Question } from "@/types/metadata";
import type { Candidate, Answer } from "@/types/candidate";

export type SessionResponse = {
	status: "idle" | "active" | "submitted" | "expired";
	sessionId: string;
	sessionToken: string;
	remainingSeconds: number;
	secondsUsed: number;
	startedAt?: string;
	expiresAt?: string;
	submittedAt?: string;
	isExamStarted: number;
	isExamSubmitted: number;
};

export async function syncAssessmentSession(payload: {
	candidateId: string;
	candidateEmail: string;
	role: string;
	experience: string;
	sessionToken?: string | null;
	force?: boolean;
}): Promise<SessionResponse> {
	return apiRequest<SessionResponse>("/api/interview/session", {
		method: "POST",
		body: payload,
	});
}

export async function sendHeartbeat(payload: {
	candidateId: string;
	sessionToken: string;
	secondsUsed: number;
}): Promise<SessionResponse> {
	return apiRequest<SessionResponse>("/api/interview/session", {
		method: "PATCH",
		body: {
			candidateId: payload.candidateId,
			sessionToken: payload.sessionToken,
			secondsUsed: payload.secondsUsed,
		},
	});
}

export async function startAssessmentSession(payload: {
	candidateId: string;
	sessionToken: string;
}): Promise<SessionResponse> {
	return apiRequest<SessionResponse>("/api/interview/session", {
		method: "PATCH",
		body: {
			candidateId: payload.candidateId,
			sessionToken: payload.sessionToken,
			action: "start",
		},
	});
}

export async function fetchAssessmentQuestions(
	role: string,
	experience: string,
	sessionId?: string,
): Promise<Question[]> {
	return apiRequest<Question[]>("/api/questions", {
		method: "GET",
		queryParams: {
			role,
			experience,
			all: "1",
			sessionId,
		},
	});
}

export async function submitAssessmentResults(payload: {
	candidate: Candidate;
	answers: Answer[];
	tabSwitches: number;
	secondsUsed: number;
}): Promise<void> {
	return apiRequest<void>("/api/results", {
		method: "POST",
		body: payload,
	});
}

export async function finalizeAssessmentSession(payload: {
	candidateId: string;
	sessionToken: string;
	secondsUsed: number;
}): Promise<void> {
	return apiRequest<void>("/api/interview/session", {
		method: "PATCH",
		body: {
			candidateId: payload.candidateId,
			sessionToken: payload.sessionToken,
			action: "submit",
			secondsUsed: payload.secondsUsed,
		},
	});
}
