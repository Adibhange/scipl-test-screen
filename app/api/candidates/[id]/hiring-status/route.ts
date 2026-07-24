import { NextRequest } from "next/server";
import { resolveWriteActor } from "@/lib/write-actor";
import { getResultByCandidateId } from "@/repositories/result.repository";
import { submitRoundFeedback } from "@/services/server/interview/interview.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { UpdateHiringStatusSchema } from "@/validators/candidate-hiring-status.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

/**
 * Backs the "Hire Selected" / "Reject Selected" bulk actions on the Shared
 * Candidates page. Deliberately goes through the SAME director-decision
 * workflow a single candidate's page uses (submitRoundFeedback with
 * round="director") rather than writing hiring_status directly — hiring_status
 * itself is derived by a Postgres trigger off director_decision, and skipping
 * that would leave the candidate's interview-round timeline with no record
 * of the decision. submitRoundFeedback also enforces the existing
 * eligibility rule (face-to-face passed, assessment not pending) and
 * role-based authorization (hr or director) — a candidate that hasn't
 * reached that point correctly fails here rather than being force-hired.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: candidateId } = await params;
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:candidate_hiring_status" });
	if (limiter.isBlocked) return limiter.response!;

	const actor = await resolveWriteActor();
	if (!actor) {
		return apiResponse.forbidden("Authentication required", "FORBIDDEN");
	}

	try {
		const body = await request.json().catch(() => null);
		const { hiringStatus } = validateSchema(UpdateHiringStatusSchema, body);
		const decision = hiringStatus === "hired" ? "hire" : "reject";

		const result = await getResultByCandidateId(candidateId);
		if (!result) {
			return apiResponse.notFound("No assessment result found for this candidate", "RESULT_NOT_FOUND");
		}

		await submitRoundFeedback(result.id, "director", undefined, "Bulk update via Shared Candidates", actor, decision);

		logSecurityEvent({
			action: "candidate_hiring_status_updated",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "success",
			details: { hiringStatus, decision },
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
