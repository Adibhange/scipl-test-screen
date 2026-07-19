import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db";
import {
	buildExamSessionResponse,
	clearExamSession,
	getExamSession,
	startExamSession,
	updateExamSession,
} from "@/lib/exam-session";

export async function GET(request: NextRequest) {
	const candidateId = request.nextUrl.searchParams.get("candidateId");
	if (!candidateId) {
		return NextResponse.json(
			{ error: "candidateId is required" },
			{ status: 400 },
		);
	}

	const session = await getExamSession(candidateId);
	if (!session) {
		return NextResponse.json(
			{ error: "No active exam session found" },
			{ status: 404 },
		);
	}

	// Verify if the candidate has failed any rounds
	const supabase = getSupabaseServerClient();
	const { data: resultRecord } = await supabase
		.from("results")
		.select("payload")
		.eq("id", candidateId)
		.maybeSingle();

	if (resultRecord) {
		const payload = resultRecord.payload as any;
		const rounds = payload?.interviewRounds || {};
		const hasFailed = Object.values(rounds).some((r: any) => r?.status === "fail");
		if (hasFailed) {
			return NextResponse.json(
				{ error: "Application Process Terminated" },
				{ status: 403 },
			);
		}
	}

	return NextResponse.json(buildExamSessionResponse(session));
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => null);
		const candidateId = body?.candidateId;
		const candidateEmail = body?.candidateEmail;
		const role = body?.role ?? "";
		const experience = body?.experience ?? "";
		const sessionToken = body?.sessionToken;
		const force = body?.force === true;

		if (!candidateId || !candidateEmail) {
			return NextResponse.json(
				{ error: "Candidate details are required" },
				{ status: 400 },
			);
		}

		// Verify if the candidate has failed any rounds
		const supabase = getSupabaseServerClient();
		const { data: resultRecord } = await supabase
			.from("results")
			.select("payload")
			.eq("id", candidateId)
			.maybeSingle();

		if (resultRecord) {
			const payload = resultRecord.payload as any;
			const rounds = payload?.interviewRounds || {};
			const hasFailed = Object.values(rounds).some((r: any) => r?.status === "fail");
			if (hasFailed) {
				return NextResponse.json(
					{ error: "Application Process Terminated" },
					{ status: 403 },
				);
			}
		}

		const existing = await getExamSession(candidateId);

		// If it's a refresh of the same tab with matching token, proceed without conflict
		if (existing && existing.is_exam_started === 1 && existing.is_exam_submitted === 0 && existing.active_session_token === sessionToken) {
			return NextResponse.json(buildExamSessionResponse(existing));
		}

		// If force-restart requested, clear the stuck session
		if (force && existing?.is_exam_started === 1 && existing?.is_exam_submitted === 0) {
			await clearExamSession(candidateId);
		}

		// Still active (and not force-cleared) — return conflict
		if (!force && existing?.is_exam_started === 1 && existing?.is_exam_submitted === 0) {
			return NextResponse.json(
				{
					error: "Exam is already active in another window",
					...buildExamSessionResponse(existing),
				},
				{ status: 409 },
			);
		}

		if (existing?.is_exam_submitted === 1) {
			return NextResponse.json(buildExamSessionResponse(existing));
		}

		const { session, conflict } = await startExamSession({
			candidateId,
			candidateEmail,
			role,
			experience,
		});
		if (conflict) {
			return NextResponse.json(
				{
					error: "Exam is already active in another window",
					...buildExamSessionResponse(session),
				},
				{ status: 409 },
			);
		}

		return NextResponse.json(buildExamSessionResponse(session), {
			status: 201,
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Could not start exam session";
		return NextResponse.json(
			{ error: msg },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json().catch(() => null);
		const candidateId = body?.candidateId;
		if (!candidateId) {
			return NextResponse.json(
				{ error: "candidateId is required" },
				{ status: 400 },
			);
		}

		const result = await updateExamSession(candidateId, {
			sessionToken: body?.sessionToken,
			action: body?.action,
			secondsUsed: body?.secondsUsed,
		});

		if (!result) {
			return NextResponse.json(
				{ error: "No active exam session found" },
				{ status: 404 },
			);
		}

		if (result.invalidToken) {
			return NextResponse.json(
				{ error: "Session token is invalid" },
				{ status: 403 },
			);
		}

		return NextResponse.json(buildExamSessionResponse(result.session));
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Could not update exam session";
		return NextResponse.json(
			{ error: msg },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	const candidateId = request.nextUrl.searchParams.get("candidateId");
	if (!candidateId) {
		return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
	}
	await clearExamSession(candidateId);
	return NextResponse.json({ cleared: true });
}
