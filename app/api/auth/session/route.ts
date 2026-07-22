import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 10, windowMs: 60000, keyPrefix: "rl:auth_session_post" });
	if (limiter.isBlocked) return limiter.response!;

	try {
		const body = await request.json().catch(() => null);
		if (!body?.token) {
			return NextResponse.json({ error: "Token is required" }, { status: 400 });
		}

		const response = NextResponse.json({ ok: true });
		response.headers.set(
			"Cache-Control",
			"no-store, no-cache, must-revalidate, private",
		);

		logSecurityEvent({
			action: "admin_session_refresh",
			actor: { ip },
			status: "success"
		});

		return response;
	} catch (error) {
		logSecurityEvent({
			action: "admin_session_refresh",
			actor: { ip },
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return NextResponse.json(
			{ error: "Could not refresh session" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 10, windowMs: 60000, keyPrefix: "rl:auth_session_delete" });
	if (limiter.isBlocked) return limiter.response!;

	const response = NextResponse.json({ ok: true });
	response.headers.set(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, private",
	);

	logSecurityEvent({
		action: "admin_session_logout",
		actor: { ip },
		status: "success"
	});

	return response;
}
