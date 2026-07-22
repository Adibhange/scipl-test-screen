/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-client";
import type { CandidateRecord } from "@/repositories/candidate.repository";
import type { CandidateResult } from "@/types";

export async function fetchAdminUsers(): Promise<any[]> {
	return apiRequest<any[]>("/api/admin/users", {
		method: "GET",
	});
}

export async function createAdminUser(body: any): Promise<any> {
	return apiRequest<any>("/api/admin/users", {
		method: "POST",
		body,
	});
}

export async function updateAdminProfile(body: any): Promise<any> {
	return apiRequest<any>("/api/admin/users", {
		method: "PUT",
		body,
	});
}

export async function updateAdminUser(body: any): Promise<any> {
	return apiRequest<any>("/api/admin/users", {
		method: "PATCH",
		body,
	});
}

export async function fetchAdminConfigurations(): Promise<{ configs: any[]; vacancies: any[] }> {
	return apiRequest<{ configs: any[]; vacancies: any[] }>("/api/admin/config", {
		method: "GET",
	});
}

export async function createAdminConfiguration(body: any): Promise<any> {
	return apiRequest<any>("/api/admin/config", {
		method: "POST",
		body,
	});
}

export async function updateAdminConfiguration(body: any): Promise<any> {
	return apiRequest<any>("/api/admin/config", {
		method: "PUT",
		body,
	});
}

export async function deleteAdminConfiguration(id: string, isVacancy: boolean, type?: string): Promise<any> {
	return apiRequest<any>("/api/admin/config", {
		method: "DELETE",
		queryParams: {
			id,
			isVacancy: String(isVacancy),
			...(type ? { type } : {}),
		},
	});
}

export async function preRegisterCandidate(candidate: any): Promise<{ candidate: CandidateRecord; result: CandidateResult }> {
	return apiRequest<{ candidate: CandidateRecord; result: CandidateResult }>("/api/admin/candidates", {
		method: "POST",
		body: candidate,
	});
}

export async function gradeCandidateAnswer(payload: {
	resultId: string;
	questionId: string;
	grade: string;
}): Promise<CandidateResult> {
	return apiRequest<CandidateResult>("/api/admin/grade", {
		method: "POST",
		body: payload,
	});
}

export async function fetchFreshCandidate(id: string): Promise<any> {
	return apiRequest<any>(`/api/admin/candidates/${id}`);
}
