import { apiRequest } from "@/lib/api-client";
import type { CandidateResult } from "@/types";

export async function fetchAllResults(): Promise<CandidateResult[]> {
	return apiRequest<CandidateResult[]>("/api/results", {
		method: "GET",
	});
}

export async function calculateResultScore(resultId: string): Promise<CandidateResult> {
	return apiRequest<CandidateResult>(`/api/results/${resultId}/calculate`, {
		method: "POST",
	});
}
