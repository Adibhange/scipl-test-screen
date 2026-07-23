import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";
import { validateSchema } from "@/lib/validate";
import { MasterLoginSchema } from "@/validators/master.validator";
import {
	MASTER_SESSION_COOKIE,
	MASTER_SESSION_MAX_AGE_SECONDS,
	createMasterSessionToken,
	verifyMasterCode,
} from "@/lib/master-session";

/**
 * POST /api/auth/master
 * Authenticates a Master Login attempt using a 6-digit code.
 * Independent from Supabase-backed Admin authentication.
 */
export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);

	// Tight rate limit on login attempts to deter brute-forcing a 6-digit code.
	const limiter = rateLimit(ip, { limit: 5, windowMs: 5 * 60 * 1000, keyPrefix: "rl:master_login" });
	if (limiter.isBlocked) {
		logSecurityEvent({
			action: "master_login",
			actor: { ip },
			status: "failure",
			details: { reason: "rate_limited" },
		});
		return limiter.response!;
	}

	if (!env.MASTER_CODE_HASH || !env.MASTER_SESSION_SECRET) {
		logSecurityEvent({
			action: "master_login",
			actor: { ip },
			status: "failure",
			details: { reason: "not_configured" },
		});
		return NextResponse.json(
			{ success: false, error: { message: "Master Login is not configured", code: "NOT_CONFIGURED" } },
			{ status: 503 },
		);
	}

	try {
		const body = await request.json().catch(() => null);
		const { code } = validateSchema(MasterLoginSchema, body);

		const isValid = await verifyMasterCode(code, env.MASTER_CODE_HASH);
		if (!isValid) {
			logSecurityEvent({
				action: "master_login",
				actor: { ip },
				status: "failure",
				details: { reason: "invalid_code" },
			});
			return NextResponse.json(
				{ success: false, error: { message: "Invalid master code", code: "INVALID_CODE" } },
				{ status: 401 },
			);
		}

		const { token } = await createMasterSessionToken(env.MASTER_SESSION_SECRET);

		const response = NextResponse.json({ success: true, data: { ok: true } });
		response.cookies.set(MASTER_SESSION_COOKIE, token, {
			httpOnly: true,
			secure: env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: MASTER_SESSION_MAX_AGE_SECONDS,
		});
		response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

		logSecurityEvent({
			action: "master_login",
			actor: { ip },
			status: "success",
		});

		return response;
	} catch (error) {
		logSecurityEvent({
			action: "master_login",
			actor: { ip },
			status: "failure",
			details: { reason: "error", error: error instanceof Error ? error.message : String(error) },
		});
		return NextResponse.json(
			{ success: false, error: { message: "Invalid request", code: "BAD_REQUEST" } },
			{ status: 400 },
		);
	}
}

/**
 * DELETE /api/auth/master
 * Logs the Master session out by clearing the session cookie.
 */
export async function DELETE(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 10, windowMs: 60000, keyPrefix: "rl:master_logout" });
	if (limiter.isBlocked) return limiter.response!;

	const response = NextResponse.json({ success: true, data: { ok: true } });
	response.cookies.set(MASTER_SESSION_COOKIE, "", {
		httpOnly: true,
		secure: env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
	response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

	logSecurityEvent({
		action: "master_logout",
		actor: { ip },
		status: "success",
	});

	return response;
}
