/**
 * Client service handler for metadata configurations fetch actions.
 */

export type CandidateMetadataResponse = {
	roles: Array<{ value: string; label: string }>;
	experience: Array<{ value: string; label: string; filled: number }>;
	testLocations: Array<{ value: string; label: string }>;
	hiringLocations: Array<{ value: string; label: string }>;
	vacancies: Array<any>;
};

export async function getCandidateMetadata(): Promise<CandidateMetadataResponse> {
	const response = await fetch("/api/candidates/metadata");
	if (!response.ok) {
		throw new Error("Failed to load candidate metadata");
	}
	return response.json();
}
