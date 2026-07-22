import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/env";

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

	if (isAdminRoute && !isAdminLoginRoute && !user) {
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
		"/interview",
		"/api/interview/:path*",
		"/api/auth/:path*",
	],
};
