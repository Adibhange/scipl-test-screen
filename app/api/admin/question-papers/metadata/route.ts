import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { resolveWriteActor } from "@/lib/write-actor";
import { getDatabaseAdapter } from "@/database/client";

/**
 * GET /api/admin/question-papers/metadata
 * Returns active roles and experiences with their database UUIDs.
 * HR and Interviewer only; Director denied.
 */
export async function GET(req: NextRequest) {
	void req;
	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Access denied.");

		const meta = getDatabaseAdapter().metadata;
		const [roles, experiences] = await Promise.all([
			meta.getMasterRoles(true),
			meta.getMasterExperiences(true),
		]);

		return apiResponse.success({
			roles: (roles || []).map((r) => ({ id: r.id, value: r.value, label: r.label })),
			experiences: (experiences || []).map((e) => ({ id: e.id, value: e.value, label: e.label })),
		});
	} catch (error) {
		return handleApiError(error, "Could not load metadata.");
	}
}
