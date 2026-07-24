import { NextRequest, NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME } from "@/services/server/admin/session.service";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const ip = getClientIpFromHeaders(request.headers);

	if (token) {
		await destroySession(token);
		logSecurityEvent({
			action: "admin_logout",
			actor: { ip },
			status: "success",
		});
	}

	const response = NextResponse.json({ success: true, data: { ok: true } });
	response.cookies.set(SESSION_COOKIE_NAME, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});

	return response;
}
