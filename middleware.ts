import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";
import { MASTER_SESSION_COOKIE, verifyMasterSessionToken } from "@/lib/master-session";

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });
	
	// Apply security headers
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

	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
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

	const {
		data: { user },
	} = await supabase.auth.getUser();
	const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
	const isAdminLoginRoute = request.nextUrl.pathname === "/admin/login";

	const masterToken = request.cookies.get(MASTER_SESSION_COOKIE)?.value;
	const hasValidMasterSession = env.MASTER_SESSION_SECRET
		? await verifyMasterSessionToken(masterToken, env.MASTER_SESSION_SECRET)
		: false;

	// A valid Master session is treated as equivalent to an Admin session for
	// /admin/* — Master genuinely uses the same admin area, not a lookalike
	// page at a different URL.
	if (isAdminRoute && !isAdminLoginRoute && !user && !hasValidMasterSession) {
		const redirectResponse = NextResponse.redirect(new URL("/admin/login", request.url));
		// Apply security headers to redirect response too
		redirectResponse.headers.set("X-Frame-Options", "DENY");
		redirectResponse.headers.set("X-Content-Type-Options", "nosniff");
		redirectResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		redirectResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
		redirectResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
		redirectResponse.headers.set(
			"Content-Security-Policy",
			"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
		);
		redirectResponse.headers.set(
			"Cache-Control",
			"no-store, no-cache, must-revalidate, private",
		);
		return redirectResponse;
	}

	// Master authentication is completely independent from Admin (Supabase) auth above.
	// Only /master/login and the share-link route (/master/admin/[token]) live here now —
	// the Master "home" is /admin itself, guarded above.
	const isMasterRoute = request.nextUrl.pathname.startsWith("/master");
	const isMasterLoginRoute = request.nextUrl.pathname === "/master/login";

	if (isMasterRoute && !isMasterLoginRoute) {
		if (!hasValidMasterSession) {
			const loginUrl = new URL("/master/login", request.url);
			loginUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
			const redirectResponse = NextResponse.redirect(loginUrl);
			redirectResponse.headers.set("X-Frame-Options", "DENY");
			redirectResponse.headers.set("X-Content-Type-Options", "nosniff");
			redirectResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
			redirectResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
			redirectResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
			redirectResponse.headers.set(
				"Content-Security-Policy",
				"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
			);
			redirectResponse.headers.set(
				"Cache-Control",
				"no-store, no-cache, must-revalidate, private",
			);
			return redirectResponse;
		}

		response.headers.set(
			"Cache-Control",
			"no-store, no-cache, must-revalidate, private",
		);
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
