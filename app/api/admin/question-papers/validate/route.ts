import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { parseAndValidateExcel } from "@/services/server/question-paper/question-paper.service";
import { resolveWriteActor } from "@/lib/write-actor";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/audit-logger";

/**
 * POST /api/admin/question-papers/validate
 * Validates an Excel file without saving. Returns validation errors and a summary.
 */
export async function POST(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:qp:validate" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot access question papers.");

		const formData = await req.formData();
		const file = formData.get("file") as File | null;

		if (!file) return apiResponse.badRequest("file is required.");

		if (!file.name.toLowerCase().endsWith(".xlsx")) {
			return apiResponse.success({
				valid: false,
				errors: ["Only .xlsx files are accepted."],
				summary: null,
			});
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const { errors, data } = await parseAndValidateExcel(buffer, file.size);

		return apiResponse.success({
			valid: errors.length === 0,
			errors,
			summary: data
				? {
						totalQuestions: data.totalQuestions,
						totalMarks: data.totalMarks,
						questionCountByType: data.questionCountByType,
				  }
				: null,
		});
	} catch (error) {
		return handleApiError(error, "Could not validate question paper.");
	}
}
