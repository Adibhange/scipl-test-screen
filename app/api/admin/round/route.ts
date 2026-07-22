import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { submitRoundFeedback } from "@/services/server/interview/interview.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { SubmitRoundFeedbackSchema } from "@/validators/admin.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function PATCH(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:round" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin) {
		return apiResponse.unauthorized("Authentication required", "UNAUTHORIZED");
	}

	let targetResultId = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(SubmitRoundFeedbackSchema, body);
		targetResultId = validated.resultId;

		const updated = await submitRoundFeedback(
			validated.resultId,
			validated.round,
			validated.status,
			validated.remarks,
			admin,
		);

		logSecurityEvent({
			action: "round_review_submitted",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: validated.resultId,
			status: "success",
			details: { round: validated.round, status: validated.status }
		});

		return apiResponse.success(updated);
	} catch (error) {
		logSecurityEvent({
			action: "round_review_submitted",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: targetResultId || undefined,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}
