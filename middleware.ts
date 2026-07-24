import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";
import { checkCredentialStatus } from "@/lib/credential-status";

async function hashTokenEdge(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function applySecurityHeaders(response: NextResponse) {
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
	response.headers.set(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
	);
	response.headers.set(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, private",
	);
}

function createSecureRedirect(url: URL, request: NextRequest): NextResponse {
	const redirectResponse = NextResponse.redirect(url);
	applySecurityHeaders(redirectResponse);
	return redirectResponse;
}

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });
	applySecurityHeaders(response);

	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return response;

	const supabase = createServerClient(url, key, {
		cookies: {
			getAll: () => request.cookies.getAll(),
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					request.cookies.set({
						name,
						value,
						...options,
					});
				});
				response = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) => {
					response.cookies.set({
						name,
						value,
						...options,
						httpOnly: true,
						secure: env.NODE_ENV === "production",
						sameSite: "lax",
					});
				});
			},
		},
	});

	const token = request.cookies.get("scipl_admin_session")?.value;
	let adminUser: any = null;

	if (token) {
		const tokenHash = await hashTokenEdge(token);
		const { data: sessionData } = await supabase
			.from("admin_sessions")
			.select("*, admin_users:admin_users(*)")
			.eq("session_token_hash", tokenHash)
			.maybeSingle();

		if (sessionData && !sessionData.revoked_at && new Date(sessionData.expires_at) > new Date()) {
			const admin = sessionData.admin_users;
			if (admin && admin.active !== false) {
				adminUser = {
					userId: admin.user_id,
					email: admin.email,
					name: admin.name,
					role: admin.role,
					mustChangeMasterPin: admin.must_change_master_pin,
				};
			}
		}
	}

	const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
	const isAdminLoginRoute = request.nextUrl.pathname === "/admin/login";
	const isMasterRoute = request.nextUrl.pathname.startsWith("/master");
	const isMasterLoginRoute = request.nextUrl.pathname === "/master/login";
	const isChangePinRoute = request.nextUrl.pathname === "/master/change-pin";

	// If trying to access protected admin/master routes
	if (
		(isAdminRoute && !isAdminLoginRoute) ||
		(isMasterRoute && !isMasterLoginRoute && !isChangePinRoute)
	) {
		if (!adminUser) {
			const loginUrl = new URL(isMasterRoute ? "/master/login" : "/admin/login", request.url);
			if (isMasterRoute) {
				loginUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
			}
			return createSecureRedirect(loginUrl, request);
		}

		// Reusable credential status check
		const credentialStatus = checkCredentialStatus(adminUser);
		if (!credentialStatus.valid && !isChangePinRoute) {
			return createSecureRedirect(new URL(credentialStatus.redirectUrl!, request.url), request);
		}
	}

	// Redirect authenticated users trying to access login pages
	if (adminUser && (isAdminLoginRoute || isMasterLoginRoute)) {
		const credentialStatus = checkCredentialStatus(adminUser);
		if (!credentialStatus.valid) {
			return createSecureRedirect(new URL(credentialStatus.redirectUrl!, request.url), request);
		}
		return createSecureRedirect(new URL("/admin", request.url), request);
	}

	if (
		request.nextUrl.pathname.startsWith("/interview") ||
		request.nextUrl.pathname.startsWith("/api/interview") ||
		request.nextUrl.pathname.startsWith("/api/auth")
	) {
		response.headers.set(
			"Cache-Control",
			"no-store, no-cache, must-revalidate, private",
		);
	}

	return response;
}

export const config = {
	matcher: [
		"/admin/:path*",
		"/master/:path*",
		"/interview",
		"/api/interview/:path*",
		"/api/auth/:path*",
	],
};
