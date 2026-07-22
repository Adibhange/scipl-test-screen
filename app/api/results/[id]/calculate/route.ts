import { calculateCandidateResults } from "@/services/server/grading/grading.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { CalculateResultScoreSchema } from "@/validators/result.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(
	request: Request,
	context: RouteContext<"/api/results/[id]/calculate">,
) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:calculate" });
	if (limiter.isBlocked) return limiter.response!;

	let targetResultId = "";
	try {
		const params = await context.params;
		const validated = validateSchema(CalculateResultScoreSchema, { id: params.id });
		targetResultId = validated.id;

		const result = await calculateCandidateResults(validated.id);

		logSecurityEvent({
			action: "exam_result_calculate",
			actor: { ip },
			targetId: validated.id,
			status: "success"
		});

		return apiResponse.success(result);
	} catch (error) {
		logSecurityEvent({
			action: "exam_result_calculate",
			actor: { ip },
			targetId: targetResultId || undefined,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}
