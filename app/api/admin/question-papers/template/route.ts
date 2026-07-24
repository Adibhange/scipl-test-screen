import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { generateExcelTemplate } from "@/services/server/question-paper/question-paper.service";
import { resolveWriteActor } from "@/lib/write-actor";

export async function GET(req: NextRequest) {
	void req;
	try {
		const actor = await resolveWriteActor();
		if (!actor) return apiResponse.unauthorized("Authentication required.");
		if (actor.role === "director") return apiResponse.forbidden("Directors cannot access question paper templates.");

		const buffer = await generateExcelTemplate();

		return new Response(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": 'attachment; filename="question-paper-template.xlsx"',
				"Content-Length": String(buffer.length),
			},
		});
	} catch (error) {
		return handleApiError(error, "Could not generate template.");
	}
}
