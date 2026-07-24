import { NextRequest, NextResponse } from "next/server";
import { validateSession, createSession, revokeAllSessionsForUser, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/services/server/admin/session.service";
import { verifyPin, hashPin } from "@/services/server/admin/credential.service";
import { verifyDirectorPinUniqueness } from "@/services/server/admin/auth.service";
import { getDatabaseAdapter } from "@/database/client";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const ip = getClientIpFromHeaders(request.headers);
	const userAgent = request.headers.get("user-agent") || "";

	if (!token) {
		return NextResponse.json({ success: false, error: { message: "No session found.", code: "UNAUTHORIZED" } }, { status: 401 });
	}

	const admin = await validateSession(token, ip, userAgent);
	if (!admin || admin.role !== "director") {
		return NextResponse.json({ success: false, error: { message: "Unauthorized. Directors only.", code: "UNAUTHORIZED" } }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { currentPin, newPin } = body;

		if (!currentPin || !newPin || !/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin)) {
			return NextResponse.json({ success: false, error: { message: "Current PIN and 6-digit new PIN are required.", code: "BAD_REQUEST" } }, { status: 400 });
		}

		// Retrieve active master_code_hash from DB to verify
		const dbAdmin = await getDatabaseAdapter().admins.getById(admin.userId);
		if (!dbAdmin || !dbAdmin.master_code_hash) {
			return NextResponse.json({ success: false, error: { message: "Director record not found or no PIN set.", code: "NOT_FOUND" } }, { status: 404 });
		}

		const isCurrentValid = await verifyPin(currentPin, dbAdmin.master_code_hash);
		if (!isCurrentValid) {
			logSecurityEvent({
				action: "director_pin_change",
				actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
				status: "failure",
				details: { reason: "invalid_current_pin" },
			});
			return NextResponse.json({ success: false, error: { message: "Current PIN is incorrect.", code: "UNAUTHORIZED" } }, { status: 401 });
		}

		// Verify uniqueness
		const isUnique = await verifyDirectorPinUniqueness(newPin);
		if (!isUnique) {
			logSecurityEvent({
				action: "director_pin_change",
				actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
				status: "failure",
				details: { reason: "pin_not_unique" },
			});
			return NextResponse.json({ success: false, error: { message: "This PIN is already in use by another active Director. Choose a different PIN.", code: "BAD_REQUEST" } }, { status: 400 });
		}

		// Hash new PIN
		const hashedNewPin = await hashPin(newPin);
		await getDatabaseAdapter().admins.update(admin.userId, {
			master_code_hash: hashedNewPin,
			must_change_master_pin: false,
			master_pin_changed_at: new Date().toISOString(),
		});

		// Session rotation: Revoke all other sessions and rotate current session
		await revokeAllSessionsForUser(admin.userId);
		const newToken = await createSession(admin.userId, ip, userAgent);

		logSecurityEvent({
			action: "director_pin_change",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			status: "success",
		});

		const response = NextResponse.json({ success: true, data: { ok: true } });
		
		response.cookies.set(SESSION_COOKIE_NAME, newToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: SESSION_MAX_AGE_SECONDS,
		});

		return response;
	} catch (error) {
		return NextResponse.json({ success: false, error: { message: "An unexpected error occurred.", code: "INTERNAL_ERROR" } }, { status: 500 });
	}
}
