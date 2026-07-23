import { ApiError } from "@/lib/api-client";

export type CandidateDocumentType = "resume" | "application_form" | "passport_photo";

async function parseOrThrow(res: Response) {
	const json = await res.json().catch(() => null);
	if (!res.ok || !json?.success) {
		throw new ApiError(json?.error?.message || `HTTP error! status: ${res.status}`, res.status, json);
	}
	return json.data;
}

export async function uploadCandidateDocument(candidateId: string, type: CandidateDocumentType, file: File) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`/api/candidates/${candidateId}/documents/${type}`, {
		method: "POST",
		body: formData,
	});
	return parseOrThrow(res) as Promise<{ status: { type: CandidateDocumentType; uploaded: boolean; uploadedAt: string | null } }>;
}

export async function deleteCandidateDocument(candidateId: string, type: CandidateDocumentType) {
	const res = await fetch(`/api/candidates/${candidateId}/documents/${type}`, { method: "DELETE" });
	return parseOrThrow(res) as Promise<{ ok: true }>;
}

export async function getCandidateDocumentUrl(candidateId: string, type: CandidateDocumentType) {
	const res = await fetch(`/api/candidates/${candidateId}/documents/${type}`, { method: "GET" });
	return parseOrThrow(res) as Promise<{ url: string }>;
}
