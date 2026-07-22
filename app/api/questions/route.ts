import { NextRequest } from "next/server";
import { getQuestionsForAssessment } from "@/services/server/assessment/assessment.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { GetQuestionsSchema } from "@/validators/assessment.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/audit-logger";

export async function GET(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:questions" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const { searchParams } = new URL(req.url);
		const query = validateSchema(GetQuestionsSchema, {
			role: searchParams.get("role"),
			experience: searchParams.get("experience"),
			all: searchParams.get("all") || undefined,
		});

		const questions = await getQuestionsForAssessment(query.role, query.experience, query.all);
		return apiResponse.success(questions);
	} catch (error) {
		return handleApiError(error, "Could not load questions");
	}
}
