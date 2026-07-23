import { apiRequest } from "@/lib/api-client";
import type { ShareRecord, ShareValidityHours } from "@/repositories/candidate-share.repository";

export async function getCandidateShareStatus(candidateId: string): Promise<{ share: ShareRecord | null }> {
	return apiRequest(`/api/candidates/${candidateId}/share`, { method: "GET" });
}

export async function generateCandidateShareLink(
	candidateId: string,
	validityHours: ShareValidityHours,
): Promise<{ share: ShareRecord }> {
	return apiRequest(`/api/candidates/${candidateId}/share`, {
		method: "POST",
		body: { validityHours },
	});
}

export async function revokeCandidateShareLink(
	candidateId: string,
	reason?: string,
): Promise<{ share: ShareRecord }> {
	return apiRequest(`/api/candidates/${candidateId}/share`, {
		method: "DELETE",
		body: { reason },
	});
}
