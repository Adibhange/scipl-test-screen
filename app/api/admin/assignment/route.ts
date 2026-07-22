import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { assignInterviewerAndDetails } from "@/services/server/interview/interview.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { AssignInterviewerSchema } from "@/validators/admin.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function PATCH(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:assignment" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin || admin.role !== "hr") {
		return apiResponse.forbidden("HR access required", "FORBIDDEN");
	}

	let targetResultId = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(AssignInterviewerSchema, body);
		targetResultId = validated.resultId;

		const updated = await assignInterviewerAndDetails(validated.resultId, validated);

		logSecurityEvent({
			action: "interviewer_assigned",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: validated.resultId,
			status: "success",
			details: { interviewerId: validated.interviewerId, interviewerName: validated.interviewerName }
		});

		return apiResponse.success(updated);
	} catch (error) {
		logSecurityEvent({
			action: "interviewer_assigned",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: targetResultId || undefined,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}
