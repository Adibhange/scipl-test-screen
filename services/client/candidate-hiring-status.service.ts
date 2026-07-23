import { apiRequest } from "@/lib/api-client";

export type HiringStatus = "screening" | "interviewing" | "offered" | "hired" | "rejected" | "on_hold";

export async function updateCandidateHiringStatus(candidateId: string, hiringStatus: HiringStatus) {
	return apiRequest<{ candidateId: string; hiringStatus: HiringStatus }>(
		`/api/candidates/${candidateId}/hiring-status`,
		{ method: "PATCH", body: { hiringStatus } },
	);
}
