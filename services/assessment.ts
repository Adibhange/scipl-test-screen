import type { Question } from "@/types/metadata";
import type { Candidate, Answer } from "@/types/candidate";

/**
 * Client service handler for Assessment and session-based API requests.
 */

export type SessionResponse = {
	status: "idle" | "active" | "submitted" | "expired";
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
	const res = await fetch("/api/interview/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (res.status === 409) {
		throw new Error("conflict");
	}
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error ?? "Failed to sync session");
	}
	return data;
}

export async function sendHeartbeat(payload: {
	candidateId: string;
	sessionToken: string;
	secondsUsed: number;
}): Promise<SessionResponse> {
	const res = await fetch("/api/interview/session", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			candidateId: payload.candidateId,
			sessionToken: payload.sessionToken,
			secondsUsed: payload.secondsUsed,
		}),
	});
	if (res.status === 403) {
		throw new Error("conflict");
	}
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error ?? "Failed to send heartbeat");
	}
	return data;
}

export async function startAssessmentSession(payload: {
	candidateId: string;
	sessionToken: string;
}): Promise<SessionResponse> {
	const res = await fetch("/api/interview/session", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			candidateId: payload.candidateId,
			sessionToken: payload.sessionToken,
			action: "start",
		}),
	});
	if (res.status === 403) {
		throw new Error("conflict");
	}
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error ?? "Failed to start assessment");
	}
	return data;
}

export async function fetchAssessmentQuestions(role: string, experience: string): Promise<Question[]> {
	const res = await fetch(
		`/api/questions?role=${encodeURIComponent(role)}&experience=${encodeURIComponent(experience)}&all=1`
	);
	if (!res.ok) {
		throw new Error("Failed to load questions");
	}
	return res.json();
}

export async function submitAssessmentResults(payload: {
	candidate: Candidate;
	answers: Answer[];
	tabSwitches: number;
	secondsUsed: number;
}): Promise<void> {
	const res = await fetch("/api/results", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const errorData = await res.json().catch(() => null);
		throw new Error(errorData?.error ?? "Could not submit assessment results");
	}
}

export async function finalizeAssessmentSession(payload: {
	candidateId: string;
	sessionToken: string;
	secondsUsed: number;
}): Promise<void> {
	const res = await fetch("/api/interview/session", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			candidateId: payload.candidateId,
			sessionToken: payload.sessionToken,
			action: "submit",
			secondsUsed: payload.secondsUsed,
		}),
	});
	if (!res.ok) {
		const errorData = await res.json().catch(() => null);
		throw new Error(errorData?.error ?? "Failed to finalize session on server");
	}
}
