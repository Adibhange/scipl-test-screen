import { NextRequest } from "next/server";
import { fetchAllResultsList, submitResults } from "@/services/server/grading/grading.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { SubmitAssessmentResultsSchema } from "@/validators/result.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function GET(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:results_get" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const results = await fetchAllResultsList();
		return apiResponse.success(results);
	} catch (error) {
		return handleApiError(error, "Could not load results");
	}
}

export async function POST(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 5, windowMs: 600000, keyPrefix: "rl:results_post" }); // 5 submissions per 10 mins
	if (limiter.isBlocked) {
		logSecurityEvent({
			action: "exam_results_submit_rate_limited",
			actor: { ip },
			status: "failure",
			details: { message: "Rate limit exceeded" }
		});
		return limiter.response!;
	}

	let candidateIdLog = "";
	let candidateEmailLog = "";
	try {
		const body = await req.json().catch(() => null);
		const validated = validateSchema(SubmitAssessmentResultsSchema, body);
		candidateIdLog = validated.candidate.id;
		candidateEmailLog = validated.candidate.email;

		const result = await submitResults(validated as unknown as Parameters<typeof submitResults>[0]);

		logSecurityEvent({
			action: "exam_results_submit",
			actor: { id: validated.candidate.id, email: validated.candidate.email, ip },
			targetId: result.id,
			status: "success",
			details: { tabSwitches: validated.tabSwitches, secondsUsed: validated.secondsUsed }
		});

		return apiResponse.created(result);
	} catch (error) {
		logSecurityEvent({
			action: "exam_results_submit",
			actor: { id: candidateIdLog || undefined, email: candidateEmailLog || undefined, ip },
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error, "Could not save assessment result");
	}
}
