import { apiRequest } from "@/lib/api-client";

export type HiringStatus = "hired" | "rejected";

export async function updateCandidateHiringStatus(candidateId: string, hiringStatus: HiringStatus) {
	return apiRequest<{ candidateId: string; hiringStatus: HiringStatus }>(
		`/api/candidates/${candidateId}/hiring-status`,
		{ method: "PATCH", body: { hiringStatus } },
	);
}
