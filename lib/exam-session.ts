import { getAssessmentRounds } from "@/data/assessment-rounds";
import { getSupabaseServerClient } from "@/lib/db";

function getExamDurationSeconds(role: string) {
	const rounds = getAssessmentRounds(role);
	return rounds.reduce((total, round) => total + round.durationSeconds, 0);
}

export async function getExamSession(candidateId: string) {
	const supabase = getSupabaseServerClient();
	const { data, error } = await supabase
		.from("exam_sessions")
		.select("*")
		.eq("candidate_id", candidateId)
		.maybeSingle();

	if (error) {
		console.error("Error fetching exam session:", error.message);
		return null;
	}
	if (!data) return null;

	// Auto-expiry check if exam is started but not submitted (using native boolean check)
	if (data.is_exam_started === true && data.is_exam_submitted === false && data.expires_at) {
		const expiresAt = new Date(data.expires_at).getTime();
		if (Date.now() >= expiresAt) {
			const { data: updated, error: updateError } = await supabase
				.from("exam_sessions")
				.update({
					is_exam_submitted: true,
					submitted_at: new Date().toISOString(),
				})
				.eq("candidate_id", candidateId)
				.select("*")
				.single();

			if (updateError) {
				console.error("Error auto-expiring session:", updateError.message);
			} else {
				return updated;
			}
		}
	}

	return data;
}

export function buildExamSessionResponse(session: any) {
	let remainingSeconds = 0;
	if (session.is_exam_started === true && session.expires_at) {
		const expiresAt = new Date(session.expires_at).getTime();
		remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
	} else {
		remainingSeconds = getExamDurationSeconds(session.role);
	}

	return {
		status:
			session.is_exam_submitted === true ? "submitted"
			: (session.is_exam_started === true && remainingSeconds <= 0) ? "expired"
			: session.is_exam_started === true ? "active"
			: "idle",
		sessionToken: session.active_session_token,
		startedAt: session.started_at,
		expiresAt: session.expires_at,
		remainingSeconds,
		secondsUsed: session.seconds_used,
		submittedAt: session.submitted_at,
		isExamStarted: session.is_exam_started,
		isExamSubmitted: session.is_exam_submitted,
	};
}

export async function startExamSession({
	candidateId,
	candidateEmail,
	role,
	experience,
}: {
	candidateId: string;
	candidateEmail: string;
	role: string;
	experience: string;
}) {
	const supabase = getSupabaseServerClient();
	const existing = await getExamSession(candidateId);

	const newToken = `${candidateId}-${Date.now()}`;

	if (existing) {
		if (existing.is_exam_submitted === true) {
			return { session: existing, conflict: false };
		}

		// Takeover: generate a new active session token
		const { data: updated, error } = await supabase
			.from("exam_sessions")
			.update({
				active_session_token: newToken,
			})
			.eq("candidate_id", candidateId)
			.select("*")
			.single();

		if (error) throw new Error(`Could not update active session token: ${error.message}`);
		return { session: updated, conflict: false };
	}

	// Create new session (using native boolean check)
	const { data: created, error } = await supabase
		.from("exam_sessions")
		.insert({
			candidate_id: candidateId,
			role,
			experience,
			is_exam_started: false,
			is_exam_submitted: false,
			active_session_token: newToken,
			seconds_used: 0,
		})
		.select("*")
		.single();

	if (error) throw new Error(`Could not create exam session: ${error.message}`);
	return { session: created, conflict: false };
}

export async function updateExamSession(
	candidateId: string,
	body: {
		sessionToken?: string;
		action?: "heartbeat" | "submit" | "start";
		secondsUsed?: number;
	},
) {
	const supabase = getSupabaseServerClient();
	const session = await getExamSession(candidateId);
	if (!session) return null;

	// Enforce takeover validation check
	if (body.sessionToken && session.active_session_token !== body.sessionToken) {
		return { session, invalidToken: true };
	}

	const updates: any = {};

	if (body.action === "start") {
		const durationSeconds = getExamDurationSeconds(session.role);
		const startedAt = new Date();
		const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);

		updates.is_exam_started = true;
		updates.started_at = startedAt.toISOString();
		updates.expires_at = expiresAt.toISOString();
	}

	if (body.action === "submit" || session.is_exam_submitted === true) {
		updates.is_exam_submitted = true;
		updates.submitted_at = new Date().toISOString();
	}

	if (typeof body.secondsUsed === "number") {
		updates.seconds_used = Math.max(0, body.secondsUsed);
	}

	if (Object.keys(updates).length > 0) {
		const { data: updated, error } = await supabase
			.from("exam_sessions")
			.update(updates)
			.eq("candidate_id", candidateId)
			.select("*")
			.single();

		if (error) throw new Error(`Could not update exam session: ${error.message}`);
		return { session: updated, invalidToken: false };
	}

	return { session, invalidToken: false };
}

export async function clearExamSession(candidateId: string) {
	const supabase = getSupabaseServerClient();
	await supabase
		.from("exam_sessions")
		.delete()
		.eq("candidate_id", candidateId);
}
