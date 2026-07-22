import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { gradeCandidateAnswer } from "@/services/server/grading/grading.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { GradeCandidateAnswerSchema } from "@/validators/admin.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:grade" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin) {
		return apiResponse.unauthorized("Authentication required", "UNAUTHORIZED");
	}

	let targetResultId = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(GradeCandidateAnswerSchema, body);
		targetResultId = validated.resultId;

		const updatedResult = await gradeCandidateAnswer(validated.resultId, validated.questionId, validated.grade);

		logSecurityEvent({
			action: "answer_graded",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: validated.resultId,
			status: "success",
			details: { questionId: validated.questionId, grade: validated.grade }
		});

		return apiResponse.success(updatedResult);
	} catch (error) {
		logSecurityEvent({
			action: "answer_graded",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: targetResultId || undefined,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}
