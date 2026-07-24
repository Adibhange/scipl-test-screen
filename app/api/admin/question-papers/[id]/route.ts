import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import {
	getPaperDetailForActor,
	removePaper,
} from "@/services/server/question-paper/question-paper.service";
import { resolveWriteActor } from "@/lib/write-actor";

/**
 * GET /api/admin/question-papers/[id]
 * Returns the paper with all items including correct answers for HR/Interviewer preview.
 * Directors are denied server-side.
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	void req;
	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot access question papers.");

		const { id } = await params;
		const paper = await getPaperDetailForActor(
			{ userId: actor.userId, role: actor.role },
			id,
		);
		return apiResponse.success(paper);
	} catch (error) {
		return handleApiError(error, "Could not load question paper.");
	}
}

/**
 * DELETE /api/admin/question-papers/[id]
 * Deletes a draft or rejected paper (own or HR).
 * Blocked by ON DELETE RESTRICT if sessions reference it.
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	void req;
	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot delete question papers.");

		const { id } = await params;
		await removePaper({ userId: actor.userId, role: actor.role }, id);
		return apiResponse.success({ deleted: true });
	} catch (error) {
		return handleApiError(error, "Could not delete question paper.");
	}
}
