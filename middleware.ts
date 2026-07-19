import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });
	response.headers.set(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, private",
	);

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) return response;

	const supabase = createServerClient(url, key, {
		cookies: {
			getAll: () => request.cookies.getAll(),
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value }) =>
					request.cookies.set(name, value),
				);
				response = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) =>
					response.cookies.set(name, value, options),
				);
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
