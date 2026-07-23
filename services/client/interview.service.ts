/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-client";
import type { CandidateResult, InterviewDecision, InterviewRoundKey } from "@/types";

export async function submitRoundFeedback(payload: {
	resultId: string;
	round: InterviewRoundKey;
	status: InterviewDecision;
	remarks: string;
}): Promise<CandidateResult> {
	return apiRequest<CandidateResult>("/api/admin/round", {
		method: "PATCH",
		body: payload,
	});
}

export async function assignInterviewerAndMetadata(payload: {
	resultId: string;
	role?: string;
	experience?: string;
	testLocation?: string;
	hiringLocation?: string;
	hiringStatus?: string;
	expectedSalary?: number | null;
	offerSalary?: number | null;
	hrNotes?: string;
	interviewerId?: string;
	interviewerName?: string;
	interviewerEmail?: string;
	experiences?: any[];
	references?: any[];
}): Promise<CandidateResult> {
	return apiRequest<CandidateResult>("/api/admin/assignment", {
		method: "PATCH",
		body: payload,
	});
}

export async function logProctoringViolation(payload: {
	candidateId: string;
	violationType?: string;
}): Promise<{ success: boolean }> {
	return apiRequest<{ success: boolean }>("/api/interview/proctoring", {
		method: "POST",
		body: payload,
	});
}
