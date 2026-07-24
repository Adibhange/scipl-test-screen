import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/services/server/admin/auth.service";
import { getClientIpFromHeaders } from "@/lib/audit-logger";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/services/server/admin/session.service";

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const userAgent = request.headers.get("user-agent") || "";

	try {
		const body = await request.json();
		const { email, password } = body;
		if (!email || !password) {
			return NextResponse.json(
				{ success: false, error: { message: "Email and password are required.", code: "BAD_REQUEST" } },
				{ status: 400 }
			);
		}

		const result = await authenticateAdmin(email, password, ip, userAgent);
		if (!result) {
			return NextResponse.json(
				{ success: false, error: { message: "Invalid email or password.", code: "UNAUTHORIZED" } },
				{ status: 401 }
			);
		}

		const response = NextResponse.json({ success: true, data: { user: { name: result.name, email: result.email, role: result.role } } });
		
		response.cookies.set(SESSION_COOKIE_NAME, result.token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: SESSION_MAX_AGE_SECONDS,
		});

		return response;
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: { message: "An unexpected error occurred.", code: "INTERNAL_ERROR" } },
			{ status: 500 }
		);
	}
}
