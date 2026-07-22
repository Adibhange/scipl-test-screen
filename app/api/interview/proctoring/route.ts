import { NextRequest } from "next/server";
import { recordProctoringLog } from "@/services/server/session/session.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { LogProctoringViolationSchema } from "@/validators/interview.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:proctoring" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(LogProctoringViolationSchema, body);

		await recordProctoringLog(validated.candidateId, validated.violationType);

		logSecurityEvent({
			action: "proctoring_violation_logged",
			actor: { id: validated.candidateId, ip },
			targetId: validated.candidateId,
			status: "success",
			details: { violationType: validated.violationType }
		});

		return apiResponse.success({ success: true });
	} catch (error) {
		return handleApiError(error);
	}
}
