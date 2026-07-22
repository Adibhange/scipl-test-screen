/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-client";

export type CandidateMetadataResponse = {
	roles: Array<{ value: string; label: string }>;
	experience: Array<{ value: string; label: string; filled: number }>;
	testLocations: Array<{ value: string; label: string }>;
	hiringLocations: Array<{ value: string; label: string }>;
	vacancies: Array<any>;
};

export async function registerCandidate(candidate: any) {
	return apiRequest<any>("/api/candidates", {
		method: "POST",
		body: candidate,
	});
}

export async function checkCandidateStatus(queryParams: {
	email: string;
	role?: string;
	experience?: string;
}) {
	return apiRequest<any>("/api/candidates", {
		method: "GET",
		queryParams,
	});
}

export async function getCandidateMetadata(): Promise<CandidateMetadataResponse> {
	return apiRequest<CandidateMetadataResponse>("/api/candidates/metadata", {
		method: "GET",
	});
}
