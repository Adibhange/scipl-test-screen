import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import {
	submitForApproval,
	approvePaper,
	rejectPaper,
	archivePaper,
} from "@/services/server/question-paper/question-paper.service";
import { resolveWriteActor } from "@/lib/write-actor";
import { validateSchema } from "@/lib/validate";
import { PaperActionSchema } from "@/validators/admin.validator";

/**
 * POST /api/admin/question-papers/[id]/action
 * Body: { action: "submit" | "approve" | "reject" | "archive", reason?: string }
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot perform paper actions.");

		const { id } = await params;
		const body = await req.json();
		const { action, reason } = validateSchema(PaperActionSchema, body);

		let updated;
		switch (action) {
			case "submit":
				updated = await submitForApproval(
					{ userId: actor.userId, role: actor.role },
					id,
				);
				break;
			case "approve":
				updated = await approvePaper(
					{ userId: actor.userId, name: actor.name, role: actor.role },
					id,
				);
				break;
			case "reject":
				updated = await rejectPaper(
					{ userId: actor.userId, role: actor.role },
					id,
					reason ?? "",
				);
				break;
			case "archive":
				updated = await archivePaper(
					{ userId: actor.userId, name: actor.name, role: actor.role },
					id,
				);
				break;
			default:
				return apiResponse.badRequest(`Unknown action: ${action}`);
		}

		return apiResponse.success(updated);
	} catch (error) {
		return handleApiError(error, "Could not perform paper action.");
	}
}
