import { NextRequest } from "next/server";
import { getMetadataAndVacancies } from "@/services/server/candidate/candidate.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const ip = getClientIpFromHeaders(req.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:metadata" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const result = await getMetadataAndVacancies();
		return apiResponse.success(result);
	} catch (err) {
		return handleApiError(err);
	}
}
