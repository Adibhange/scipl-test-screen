import { NextRequest } from "next/server";
import {
	getCandidateWithSessionValidation,
	processCandidateIntake,
} from "@/services/server/candidate/candidate.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { CheckCandidateStatusSchema, RegisterCandidateSchema } from "@/validators/candidate.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function GET(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:candidates_get" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const { searchParams } = new URL(req.url);
		const query = validateSchema(CheckCandidateStatusSchema, {
			email: searchParams.get("email"),
			role: searchParams.get("role") || undefined,
			experience: searchParams.get("experience") || undefined,
		});

		const result = await getCandidateWithSessionValidation(query.email, query.role, query.experience);
		return apiResponse.success(result);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 5, windowMs: 600000, keyPrefix: "rl:candidates_post" }); // 5 requests per 10 mins
	if (limiter.isBlocked) {
		logSecurityEvent({
			action: "candidate_registration_rate_limited",
			actor: { ip },
			status: "failure",
			details: { message: "Rate limit exceeded" }
		});
		return limiter.response!;
	}

	let validatedEmail = "";
	try {
		const body = await req.json().catch(() => null);
		const validated = validateSchema(RegisterCandidateSchema, body);
		validatedEmail = validated.email;

		const result = await processCandidateIntake(validated.email, validated.vacancyId);

		logSecurityEvent({
			action: "candidate_registration_intake",
			actor: { email: validated.email, ip },
			targetId: result.id,
			status: "success"
		});

		return apiResponse.success(result);
	} catch (error) {
		logSecurityEvent({
			action: "candidate_registration_intake",
			actor: { email: validatedEmail || undefined, ip },
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error, "Failed to register candidate");
	}
}
