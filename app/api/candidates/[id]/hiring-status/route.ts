import { NextRequest } from "next/server";
import { resolveWriteActor } from "@/lib/write-actor";
import { updateCandidate } from "@/repositories/candidate.repository";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { UpdateHiringStatusSchema } from "@/validators/candidate-hiring-status.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

/**
 * Deliberately narrow: updates ONLY hiring_status, nothing else on the
 * candidate record (no interviewer fields, no salary, no notes). Built for
 * bulk "Hire Selected" / "Reject Selected" actions where touching anything
 * else would be unintended side effects.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: candidateId } = await params;
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:candidate_hiring_status" });
	if (limiter.isBlocked) return limiter.response!;

	const actor = await resolveWriteActor();
	if (!actor || actor.role !== "hr") {
		return apiResponse.forbidden("HR access required", "FORBIDDEN");
	}

	try {
		const body = await request.json().catch(() => null);
		const { hiringStatus } = validateSchema(UpdateHiringStatusSchema, body);

		await updateCandidate(candidateId, { hiringStatus });

		logSecurityEvent({
			action: "candidate_hiring_status_updated",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "success",
			details: { hiringStatus },
		});

		return apiResponse.success({ candidateId, hiringStatus });
	} catch (error) {
		logSecurityEvent({
			action: "candidate_hiring_status_updated",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) },
		});
		return handleApiError(error, "Failed to update hiring status");
	}
}
