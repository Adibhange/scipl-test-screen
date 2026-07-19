import type { Candidate } from "@/types/candidate";

/**
 * Client service handler for Candidate-centric API requests.
 */

export async function registerCandidate(candidate: Candidate) {
	const response = await fetch("/api/candidates", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(candidate),
	});
	const payload = await response.json();
	if (!response.ok) {
		throw new Error(payload.error ?? "Could not save candidate information.");
	}
	return payload;
}
