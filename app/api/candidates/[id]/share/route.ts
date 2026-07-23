import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { getCurrentMaster } from "@/repositories/master.repository";
import {
	generateShareLink,
	getShareStatus,
	revokeShareLink,
} from "@/repositories/candidate-share.repository";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { GenerateShareLinkSchema, RevokeShareLinkSchema } from "@/validators/candidate-share.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

/**
 * Resolves who is calling — an Admin (HR/interviewer/director) or a Master
 * session. Both are permitted to manage share links (Feature 14); this route
 * does not distinguish beyond producing an audit-log actor label.
 */
async function resolveActor() {
	const admin = await getCurrentAdmin();
	if (admin) return { id: admin.userId, label: admin.email, kind: "admin" as const };

	const master = await getCurrentMaster();
	if (master) return { id: "master", label: "master", kind: "master" as const };

	return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: candidateId } = await params;
	const actor = await resolveActor();
	if (!actor) return apiResponse.unauthorized("Sign in required", "UNAUTHORIZED");

	try {
		const status = await getShareStatus(candidateId);
		return apiResponse.success({ share: status });
	} catch (error) {
		return handleApiError(error, "Failed to load share link status");
	}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: candidateId } = await params;
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:share_generate" });
	if (limiter.isBlocked) return limiter.response!;

	const actor = await resolveActor();
	if (!actor) return apiResponse.unauthorized("Sign in required", "UNAUTHORIZED");

	try {
		const body = await request.json().catch(() => ({}));
		const { validityHours } = validateSchema(GenerateShareLinkSchema, body ?? {});

		const share = await generateShareLink({
			candidateId,
			validityHours,
			createdBy: actor.label,
		});

		logSecurityEvent({
			action: "candidate_share_generated",
			actor: { id: actor.id, email: actor.kind === "admin" ? actor.label : undefined, role: actor.kind, ip },
			targetId: candidateId,
			status: "success",
			details: { validityHours, shareId: share.id },
		});

		return apiResponse.created({ share });
	} catch (error) {
		logSecurityEvent({
			action: "candidate_share_generated",
			actor: { id: actor.id, role: actor.kind, ip },
			targetId: candidateId,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) },
		});
		return handleApiError(error, "Failed to generate share link");
	}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: candidateId } = await params;
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:share_revoke" });
	if (limiter.isBlocked) return limiter.response!;

	const actor = await resolveActor();
	if (!actor) return apiResponse.unauthorized("Sign in required", "UNAUTHORIZED");

	try {
		const body = await request.json().catch(() => ({}));
		const { reason } = validateSchema(RevokeShareLinkSchema, body ?? {});

		const share = await revokeShareLink({
			candidateId,
			revokedBy: actor.label,
			reason,
		});

		logSecurityEvent({
			action: "candidate_share_revoked",
			actor: { id: actor.id, email: actor.kind === "admin" ? actor.label : undefined, role: actor.kind, ip },
			targetId: candidateId,
			status: "success",
			details: { shareId: share.id, reason },
		});

		return apiResponse.success({ share });
	} catch (error) {
		logSecurityEvent({
			action: "candidate_share_revoked",
			actor: { id: actor.id, role: actor.kind, ip },
			targetId: candidateId,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) },
		});
		return handleApiError(error, "Failed to revoke share link");
	}
}
