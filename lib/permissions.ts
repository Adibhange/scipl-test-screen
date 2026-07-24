export type AdminRole = "hr" | "interviewer" | "director";

export const FULL_ADMIN_ROLES: AdminRole[] = ["hr", "director"];

export function canAccessConfig(role: AdminRole): boolean {
	return role === "hr";
}

export function canAccessTeam(role: AdminRole): boolean {
	return role === "hr";
}

export function canAccessQuestionPapers(role: AdminRole): boolean {
	return role !== "director";
}

export function canReviewRound(role: AdminRole, round: "face_to_face" | "assessment" | "director"): boolean {
	return (
		role === "hr" ||
		(role === "interviewer" && round !== "director") ||
		(role === "director" && round === "director")
	);
}
