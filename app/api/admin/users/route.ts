import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/db";

export async function GET() {
	const admin = await getCurrentAdmin();
	if (!admin)
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	const { data, error } = await getSupabaseServerClient()
		.from("admin_users")
		.select("user_id, email, name, role, created_at")
		.order("created_at", { ascending: false });
	if (error)
		return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
	const admin = await getCurrentAdmin();
	if (!admin || admin.role !== "hr")
		return NextResponse.json({ error: "HR access required" }, { status: 403 });
	const body = await request.json();
	const email =
		typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const password = typeof body.password === "string" ? body.password : "";
	const role = body.role;
	if (
		!email ||
		!name ||
		password.length < 8 ||
		!["hr", "interviewer", "director"].includes(role)
	) {
		return NextResponse.json(
			{
				error:
					"Name, valid email, role and an 8 character password are required.",
			},
			{ status: 400 },
		);
	}

	const supabase = getSupabaseServerClient();
	const { data: created, error: createError } =
		await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
		});
	let userId = created.user?.id;
	if (
		createError &&
		!createError.message.toLowerCase().includes("already registered")
	) {
		return NextResponse.json({ error: createError.message }, { status: 400 });
	}
	if (!userId) {
		const { data: users, error } = await supabase.auth.admin.listUsers();
		if (error)
			return NextResponse.json({ error: error.message }, { status: 500 });
		userId = users.users.find(
			(user) => user.email?.toLowerCase() === email,
		)?.id;
	}
	if (!userId)
		return NextResponse.json(
			{ error: "Could not find the Auth user." },
			{ status: 400 },
		);

	const { data, error } = await supabase
		.from("admin_users")
		.upsert({ user_id: userId, email, name, role }, { onConflict: "user_id" })
		.select("user_id, email, name, role")
		.single();
	if (error)
		return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
	const admin = await getCurrentAdmin();
	if (!admin)
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);

	const body = await request.json();
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const email =
		typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";

	if (!name || !email) {
		return NextResponse.json(
			{ error: "Name and email are required." },
			{ status: 400 },
		);
	}

	if (password && password.length < 8) {
		return NextResponse.json(
			{ error: "Password must be at least 8 characters." },
			{ status: 400 },
		);
	}

	const supabase = getSupabaseServerClient();
	const updates: Record<string, string> = { name, email };
	const { error: updateError } = await supabase
		.from("admin_users")
		.update(updates)
		.eq("user_id", admin.userId);
	if (updateError)
		return NextResponse.json({ error: updateError.message }, { status: 500 });

	if (email !== admin.email) {
		const { error: authEmailError } = await supabase.auth.admin.updateUserById(
			admin.userId,
			{ email },
		);
		if (authEmailError)
			return NextResponse.json(
				{ error: authEmailError.message },
				{ status: 500 },
			);
	}

	if (password) {
		const { error: authPasswordError } =
			await supabase.auth.admin.updateUserById(admin.userId, { password });
		if (authPasswordError)
			return NextResponse.json(
				{ error: authPasswordError.message },
				{ status: 500 },
			);
	}

	return NextResponse.json({ message: "Profile updated" }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
	const admin = await getCurrentAdmin();
	if (!admin || !["hr", "director"].includes(admin.role)) {
		return NextResponse.json(
			{ error: "HR or Director access required" },
			{ status: 403 },
		);
	}

	const body = await request.json();
	const { userId, name, email, password, role } = body;

	if (!userId || typeof userId !== "string") {
		return NextResponse.json({ error: "userId is required." }, { status: 400 });
	}
	if (!name || !email) {
		return NextResponse.json(
			{ error: "Name and email are required." },
			{ status: 400 },
		);
	}
	if (role && !["hr", "interviewer", "director"].includes(role)) {
		return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
	}
	if (password && password.length < 8) {
		return NextResponse.json(
			{ error: "Password must be at least 8 characters." },
			{ status: 400 },
		);
	}

	const supabase = getSupabaseServerClient();
	const updates: Record<string, string> = {
		name: name.trim(),
		email: email.trim().toLowerCase(),
		...(role ? { role } : {}),
	};

	const { error: dbError } = await supabase
		.from("admin_users")
		.update(updates)
		.eq("user_id", userId);
	if (dbError)
		return NextResponse.json({ error: dbError.message }, { status: 500 });

	const { error: authEmailError } = await supabase.auth.admin.updateUserById(
		userId,
		{ email: email.trim().toLowerCase() },
	);
	if (authEmailError)
		return NextResponse.json(
			{ error: authEmailError.message },
			{ status: 500 },
		);

	if (password) {
		const { error: authPasswordError } =
			await supabase.auth.admin.updateUserById(userId, { password });
		if (authPasswordError)
			return NextResponse.json(
				{ error: authPasswordError.message },
				{ status: 500 },
			);
	}

	return NextResponse.json({ message: "User updated" }, { status: 200 });
}

