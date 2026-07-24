import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import {
	parseAndValidateExcel,
	saveDraft,
	listPapersForActor,
} from "@/services/server/question-paper/question-paper.service";
import { resolveWriteActor } from "@/lib/write-actor";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/audit-logger";

/**
 * GET /api/admin/question-papers
 * Lists papers visible to the authenticated actor:
 *   HR → all papers
 *   Interviewer → own papers only
 *   Director → 403
 */
export async function GET(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:qp:list" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot access question papers.");

		const papers = await listPapersForActor({ userId: actor.userId, role: actor.role });
		return apiResponse.success(papers);
	} catch (error) {
		return handleApiError(error, "Could not list question papers.");
	}
}

/**
 * POST /api/admin/question-papers
 * Accepts multipart/form-data with:
 *   - file: .xlsx file
 *   - roleId: UUID
 *   - experienceId: UUID
 *   - title: string
 * Parses & validates the Excel file server-side, then saves as draft.
 * Returns { data: { paper, errors } } — paper is null when errors exist.
 */
export async function POST(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 20, windowMs: 60000, keyPrefix: "rl:qp:upload" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot upload question papers.");

		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const roleId = (formData.get("roleId") as string | null)?.trim();
		const experienceId = (formData.get("experienceId") as string | null)?.trim();
		const title = (formData.get("title") as string | null)?.trim();

		if (!file || !roleId || !experienceId || !title) {
			return apiResponse.badRequest("file, roleId, experienceId, and title are required.");
		}

		// Reject non-xlsx immediately before reading
		if (!file.name.toLowerCase().endsWith(".xlsx")) {
			return apiResponse.badRequest("Only .xlsx files are accepted.");
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const { errors, data } = await parseAndValidateExcel(buffer, file.size);

		if (errors.length > 0 || !data) {
			return apiResponse.success({ paper: null, errors });
		}

		const paper = await saveDraft(
			{ userId: actor.userId, name: actor.name, role: actor.role },
			roleId,
			experienceId,
			title,
			data,
		);

		return apiResponse.created({ paper, errors: [] });
	} catch (error) {
		return handleApiError(error, "Could not create question paper.");
	}
}
