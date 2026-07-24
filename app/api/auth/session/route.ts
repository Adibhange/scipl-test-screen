import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@/services/server/admin/session.service";
import { getClientIpFromHeaders } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const ip = getClientIpFromHeaders(request.headers);
	const userAgent = request.headers.get("user-agent") || "";

	if (!token) {
		return NextResponse.json({ success: false, error: { message: "No session found.", code: "UNAUTHORIZED" } }, { status: 401 });
	}

	const sessionUser = await validateSession(token, ip, userAgent);
	if (!sessionUser) {
		return NextResponse.json({ success: false, error: { message: "Invalid session.", code: "UNAUTHORIZED" } }, { status: 401 });
	}

	return NextResponse.json({
		success: true,
		data: {
			user: {
				name: sessionUser.name,
				email: sessionUser.email,
				role: sessionUser.role,
			},
			expiresAt: sessionUser.expiresAt,
		},
	});
}
