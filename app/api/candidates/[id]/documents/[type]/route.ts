import { NextRequest } from "next/server";
import { resolveWriteActor } from "@/lib/write-actor";
import {
	deleteCandidateDocument,
	getCandidateDocumentUrl,
	uploadCandidateDocumentFile,
} from "@/repositories/candidate-document.repository";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import { CandidateDocumentTypeSchema } from "@/validators/candidate-document.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

type RouteParams = { params: Promise<{ id: string; type: string }> };

/**
 * View access (GET) is open to any authenticated admin role or Master.
 * Mutating access (POST/DELETE) requires the "hr" permission level —
 * Master always qualifies via its synthetic hr-equivalent actor.
 */
async function requireViewer() {
	const actor = await resolveWriteActor();
	if (!actor) return { actor: null, response: apiResponse.unauthorized("Sign in required", "UNAUTHORIZED") };
	return { actor, response: null };
}

async function requireManager() {
	const actor = await resolveWriteActor();
	if (!actor) return { actor: null, response: apiResponse.unauthorized("Sign in required", "UNAUTHORIZED") };
	if (actor.role !== "hr") return { actor: null, response: apiResponse.forbidden("HR access required", "FORBIDDEN") };
	return { actor, response: null };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id: candidateId, type } = await params;
	const { actor, response } = await requireViewer();
	if (!actor) return response!;

	try {
		const docType = validateSchema(CandidateDocumentTypeSchema, type);
		const url = await getCandidateDocumentUrl(candidateId, docType);
		return apiResponse.success({ url });
	} catch (error) {
		return handleApiError(error, "Failed to generate document link");
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	const { id: candidateId, type } = await params;
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:candidate_document_upload" });
	if (limiter.isBlocked) return limiter.response!;

	const { actor, response } = await requireManager();
	if (!actor) return response!;

	try {
		const docType = validateSchema(CandidateDocumentTypeSchema, type);
		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return apiResponse.badRequest("A file is required", "BAD_REQUEST");
		}

		const status = await uploadCandidateDocumentFile(candidateId, docType, file);

		logSecurityEvent({
			action: "candidate_document_uploaded",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "success",
			details: { documentType: docType, fileSize: file.size },
		});

		return apiResponse.success({ status });
	} catch (error) {
		logSecurityEvent({
			action: "candidate_document_uploaded",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) },
		});
		return handleApiError(error, "Failed to upload document");
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id: candidateId, type } = await params;
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:candidate_document_delete" });
	if (limiter.isBlocked) return limiter.response!;

	const { actor, response } = await requireManager();
	if (!actor) return response!;

	try {
		const docType = validateSchema(CandidateDocumentTypeSchema, type);
		await deleteCandidateDocument(candidateId, docType);

		logSecurityEvent({
			action: "candidate_document_deleted",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "success",
			details: { documentType: docType },
		});

		return apiResponse.success({ ok: true });
	} catch (error) {
		logSecurityEvent({
			action: "candidate_document_deleted",
			actor: { id: actor.userId, email: actor.email, role: actor.role, ip },
			targetId: candidateId,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) },
		});
		return handleApiError(error, "Failed to delete document");
	}
}
