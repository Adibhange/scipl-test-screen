import { NextRequest } from "next/server";
import {
	getExamSessionDetails,
	initiateExamSession,
	progressExamSession,
	clearActiveSession,
} from "@/services/server/session/session.service";
import { buildExamSessionResponse } from "@/repositories/exam-session.repository";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import {
	GetExamSessionSchema,
	InitiateExamSessionSchema,
	ProgressExamSessionSchema,
	DeleteExamSessionSchema,
} from "@/validators/session.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:session_get" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const { searchParams } = new URL(request.url);
		const query = validateSchema(GetExamSessionSchema, {
			candidateId: searchParams.get("candidateId"),
		});

		const session = await getExamSessionDetails(query.candidateId);
		return apiResponse.success(buildExamSessionResponse(session));
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 10, windowMs: 60000, keyPrefix: "rl:session_post" });
	if (limiter.isBlocked) return limiter.response!;

	let candidateIdLog = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(InitiateExamSessionSchema, body);
		candidateIdLog = validated.candidateId;

		const { session, conflict } = await initiateExamSession({
			candidateId: validated.candidateId,
			candidateEmail: validated.candidateEmail,
			role: validated.role,
			experience: validated.experience,
			sessionToken: validated.sessionToken || undefined,
			force: validated.force,
		});

		if (conflict) {
			logSecurityEvent({
				action: "exam_session_initiate_conflict",
				actor: { id: validated.candidateId, email: validated.candidateEmail, ip },
				status: "failure",
				details: { message: "Conflict: Session active in another window" }
			});
			return apiResponse.conflict("conflict", "CONFLICT");
		}

		logSecurityEvent({
			action: "exam_session_initiate",
			actor: { id: validated.candidateId, email: validated.candidateEmail, ip },
			status: "success",
			details: { force: validated.force }
		});

		const status = session.is_exam_submitted === true ? 200 : 201;
		return apiResponse.success(buildExamSessionResponse(session), status);
	} catch (error) {
		logSecurityEvent({
			action: "exam_session_initiate",
			actor: { id: candidateIdLog || undefined, ip },
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error, "Could not start exam session");
	}
}

export async function PATCH(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:session_patch" }); // Allow high frequency for heartbeats
	if (limiter.isBlocked) return limiter.response!;

	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(ProgressExamSessionSchema, body);

		const session = await progressExamSession(validated.candidateId, {
			sessionToken: validated.sessionToken,
			action: validated.action,
			secondsUsed: validated.secondsUsed,
		});

		if (validated.action === "submit") {
			logSecurityEvent({
				action: "exam_session_submit_action",
				actor: { id: validated.candidateId, ip },
				status: "success",
				details: { secondsUsed: validated.secondsUsed }
			});
		}

		return apiResponse.success(buildExamSessionResponse(session));
	} catch (error) {
		return handleApiError(error, "Could not update exam session");
	}
}

export async function DELETE(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 10, windowMs: 60000, keyPrefix: "rl:session_delete" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const { searchParams } = new URL(request.url);
		const query = validateSchema(DeleteExamSessionSchema, {
			candidateId: searchParams.get("candidateId"),
		});

		await clearActiveSession(query.candidateId);

		logSecurityEvent({
			action: "exam_session_clear",
			actor: { id: query.candidateId, ip },
			status: "success"
		});

		return apiResponse.success({ cleared: true });
	} catch (error) {
		return handleApiError(error);
	}
}
