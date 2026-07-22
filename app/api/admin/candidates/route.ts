import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { preRegisterCandidateByAdmin } from "@/services/server/candidate/candidate.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { PreRegisterCandidateSchema } from "@/validators/admin.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:admin_candidates" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin || admin.role !== "hr") {
		return apiResponse.forbidden("HR access required", "FORBIDDEN");
	}

	let validatedEmail = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(PreRegisterCandidateSchema, body);
		validatedEmail = validated.email;

		const result = await preRegisterCandidateByAdmin({
			firstName: validated.firstName,
			lastName: validated.lastName,
			mobile: validated.mobile,
			email: validated.email,
			role: validated.role,
			experience: validated.experience,
			testLocation: validated.testLocation || "home",
			hiringLocation: validated.hiringLocation || undefined,
			vacancyId: validated.vacancyId || undefined,
			experiences: validated.experiences,
			references: validated.references,
		});

		logSecurityEvent({
			action: "candidate_pre_register_by_admin",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: result.candidate?.id,
			status: "success",
			details: { email: validated.email, role: validated.role }
		});

		return apiResponse.created(result);
	} catch (error) {
		logSecurityEvent({
			action: "candidate_pre_register_by_admin",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			status: "failure",
			details: { email: validatedEmail || undefined, error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error, "Failed to pre-register candidate");
	}
}
