/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	getExamSession as getSessionRepo,
	startExamSession as startSessionRepo,
	updateExamSession as updateSessionRepo,
	clearExamSession as clearSessionRepo,
} from "@/repositories/exam-session.repository";
import { getResultById, insertProctoringLog } from "@/repositories/result.repository";
import { AuthorizationError, NotFoundError } from "@/lib/errors";

/**
 * Service to handle exam session state, progressions, and auto-expiries.
 */
export async function getExamSessionDetails(candidateId: string) {
	const session = await getSessionRepo(candidateId);
	if (!session) {
		throw new NotFoundError("No active exam session found");
	}

	// Verify if the candidate has failed any rounds
	const resultRecord = await getResultById(session.id);
	if (resultRecord) {
		const rounds = resultRecord.interviewRounds || {};
		const hasFailed = (rounds as any)?.face_to_face?.status === "fail";
		if (hasFailed) {
			throw new AuthorizationError("Application Process Terminated");
		}
	}

	return session;
}

export async function initiateExamSession(body: {
	candidateId: string;
	candidateEmail: string;
	role: string;
	experience: string;
	sessionToken?: string;
	force?: boolean;
}) {
	const { candidateId, candidateEmail, role, experience, sessionToken, force } = body;

	const existing = await getSessionRepo(candidateId);

	// Verify if the candidate has failed any rounds
	if (existing) {
		const resultRecord = await getResultById(existing.id);
		if (resultRecord) {
			const rounds = resultRecord.interviewRounds || {};
			const hasFailed = (rounds as any)?.face_to_face?.status === "fail";
			if (hasFailed) {
				throw new AuthorizationError("Application Process Terminated");
			}
		}
	}

	// If it's a refresh of the same tab with matching token, proceed without conflict (using booleans)
	if (existing && existing.is_exam_started === true && existing.is_exam_submitted === false && existing.active_session_token === sessionToken) {
		return { session: existing, conflict: false };
	}

	// If force-restart requested, clear the stuck session
	if (force && existing?.is_exam_started === true && existing?.is_exam_submitted === false) {
		await clearSessionRepo(candidateId);
	}

	// Still active (and not force-cleared) — return conflict
	if (!force && existing?.is_exam_started === true && existing?.is_exam_submitted === false) {
		return { session: existing, conflict: true };
	}

	if (existing?.is_exam_submitted === true) {
		return { session: existing, conflict: false };
	}

	const result = await startSessionRepo({
		candidateId,
		candidateEmail,
		role,
		experience,
	});

	return { session: result.session, conflict: false };
}

export async function progressExamSession(
	candidateId: string,
	body: {
		sessionToken?: string;
		action?: "heartbeat" | "submit" | "start";
		secondsUsed?: number;
	},
) {
	const result = await updateSessionRepo(candidateId, body);

	if (!result) {
		throw new NotFoundError("No active exam session found");
	}

	if (result.invalidToken) {
		throw new AuthorizationError("Session token is invalid");
	}

	return result.session;
}

export async function clearActiveSession(candidateId: string) {
	await clearSessionRepo(candidateId);
}

export async function recordProctoringLog(candidateId: string, violationType: string) {
	const session = await getSessionRepo(candidateId);
	if (!session) {
		throw new NotFoundError("No active exam session found");
	}
	await insertProctoringLog(session.id, violationType);
}
