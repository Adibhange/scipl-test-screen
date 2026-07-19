import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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
		return response;
	} catch {
		return NextResponse.json(
			{ error: "Could not refresh session" },
			{ status: 500 },
		);
	}
}

export async function DELETE() {
	const response = NextResponse.json({ ok: true });
	response.headers.set(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, private",
	);
	return response;
}
