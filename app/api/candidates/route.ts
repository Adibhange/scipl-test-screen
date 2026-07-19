import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db";

export async function GET(req: NextRequest) {
	const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
	const role = req.nextUrl.searchParams.get("role")?.trim();
	const experience = req.nextUrl.searchParams.get("experience")?.trim();

	if (!email) {
		return NextResponse.json(
			{ error: "email is a required query parameter" },
			{ status: 400 },
		);
	}

	const { data: candidate } = await getSupabaseServerClient()
		.from("candidates")
		.select("id, name, mobile, role, experience, test_location")
		.ilike("email", email)
		.maybeSingle();

	if (!candidate) {
		return NextResponse.json(
			{ error: "You are not pre-registered. Please contact HR." },
			{ status: 403 },
		);
	}

	if (role && experience) {
		if ((candidate.role ?? "").toLowerCase().trim() !== (role ?? "").toLowerCase().trim() || (candidate.experience ?? "").toLowerCase().trim() !== (experience ?? "").toLowerCase().trim()) {
			return NextResponse.json(
				{ error: `Mismatch: You are registered for the "${candidate.role}" role with "${candidate.experience}" years of experience. Please select these options.` },
				{ status: 403 },
			);
		}
	}

	const { data: resultRecord } = await getSupabaseServerClient()
		.from("results")
		.select("payload")
		.eq("id", candidate.id)
		.maybeSingle();

	if (!resultRecord) {
		return NextResponse.json(
			{ error: "No screening review found. Please contact HR." },
			{ status: 403 },
		);
	}

	const resultPayload = resultRecord.payload as any;
	const rounds = resultPayload?.interviewRounds || {};
	const hasFailed = Object.values(rounds).some((r: any) => r?.status === "fail");
	if (hasFailed) {
		return NextResponse.json(
			{ error: "Application Process Terminated" },
			{ status: 403 },
		);
	}

	const faceToFaceStatus =
		resultPayload?.interviewRounds?.face_to_face?.status;

	if (faceToFaceStatus !== "pass") {
		return NextResponse.json(
			{ error: "You have not cleared the face-to-face screening round yet." },
			{ status: 403 },
		);
	}

	const { data: session } = await getSupabaseServerClient()
		.from("exam_sessions")
		.select("is_exam_submitted")
		.eq("candidate_id", candidate.id)
		.maybeSingle();

	const completed = session?.is_exam_submitted === 1;
	return NextResponse.json({
		completed,
		candidate: {
			id: candidate.id,
			name: candidate.name,
			mobile: candidate.mobile,
			role: candidate.role,
			experience: candidate.experience,
			testLocation: candidate.test_location ?? "home",
		}
	});
}

const requiredFields = [
	"name",
	"mobile",
	"email",
	"role",
	"experience",
] as const;

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		if (
			!body ||
			requiredFields.some(
				(field) => typeof body[field] !== "string" || !body[field].trim(),
			)
		) {
			return NextResponse.json(
				{ error: "All candidate fields are required." },
				{ status: 400 },
			);
		}

		const email = body.email.trim().toLowerCase();
		const role = body.role.trim();
		const experience = body.experience.trim();

		const { data: existing } = await getSupabaseServerClient()
			.from("candidates")
			.select(
				"id, name, mobile, email, role, experience, test_location, hiring_location, hiring_status",
			)
			.ilike("email", email)
			.maybeSingle();

		if (!existing) {
			return NextResponse.json(
				{ error: "You are not pre-registered. Please contact HR." },
				{ status: 403 },
			);
		}

		if ((existing.role ?? "").toLowerCase().trim() !== (role ?? "").toLowerCase().trim() || (existing.experience ?? "").toLowerCase().trim() !== (experience ?? "").toLowerCase().trim()) {
			return NextResponse.json(
				{ error: `Mismatch: You are registered for the "${existing.role}" role with "${existing.experience}" years of experience. Please select these options.` },
				{ status: 403 },
			);
		}

		const { data: resultRecord } = await getSupabaseServerClient()
			.from("results")
			.select("payload")
			.eq("id", existing.id)
			.maybeSingle();

		if (!resultRecord) {
			return NextResponse.json(
				{ error: "No screening review found. Please contact HR." },
				{ status: 403 },
			);
		}

		const resultPayload = resultRecord.payload as any;
		const faceToFaceStatus =
			resultPayload?.interviewRounds?.face_to_face?.status;

		if (faceToFaceStatus !== "pass") {
			return NextResponse.json(
				{ error: "You have not cleared the face-to-face screening round yet." },
				{ status: 403 },
			);
		}

		// Query the exam session to check progression status
		const { data: session } = await getSupabaseServerClient()
			.from("exam_sessions")
			.select("is_exam_submitted")
			.eq("candidate_id", existing.id)
			.maybeSingle();

		if (session && session.is_exam_submitted === 1) {
			return NextResponse.json(
				{
					error:
						"You have already completed the assessment for this specific vacancy.",
				},
				{ status: 403 },
			);
		}

		// Generate new session token (takeover active session)
		const newToken = `${existing.id}-${Date.now()}`;
		const { error: sessionError } = await getSupabaseServerClient()
			.from("exam_sessions")
			.upsert(
				{
					candidate_id: existing.id,
					role: existing.role,
					experience: existing.experience,
					active_session_token: newToken,
				},
				{ onConflict: "candidate_id,role,experience" },
			);

		if (sessionError) {
			console.error("Upsert session token error:", sessionError.message);
		}

		return NextResponse.json(
			{
				id: existing.id,
				name: existing.name,
				mobile: existing.mobile,
				email: existing.email,
				role: existing.role,
				experience: existing.experience,
				testLocation: existing.test_location ?? "home",
				hiringLocation: existing.hiring_location ?? undefined,
				hiringStatus: existing.hiring_status ?? "screening",
				active_session_token: newToken,
			},
			{ status: 200 },
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to register candidate";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
