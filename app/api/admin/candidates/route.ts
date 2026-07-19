import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createCandidate } from "@/lib/db";
import { saveResult } from "@/lib/results";
import { emptyInterviewRounds } from "@/lib/interview-rounds";

export async function POST(request: NextRequest) {
	const admin = await getCurrentAdmin();
	if (!admin || admin.role !== "hr") {
		return NextResponse.json({ error: "HR access required" }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { name, mobile, email, role, experience, testLocation } = body;

		if (!name || !mobile || !email || !role || !experience) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Create candidate record in database
		const candidate = await createCandidate({
			name: name.trim(),
			mobile: mobile.trim(),
			email: email.trim().toLowerCase(),
			role: role.trim(),
			experience: experience.trim(),
			testLocation: testLocation || "home",
		});

		// Create placeholder result record to allow interviewer review on face-to-face round
		const resultId = candidate.id;
		const placeholderResult = {
			id: resultId,
			candidate: {
				id: candidate.id,
				name: candidate.name,
				mobile: candidate.mobile,
				email: candidate.email,
				role: candidate.role,
				experience: candidate.experience,
				testLocation: candidate.testLocation,
				hiringStatus: "screening" as const,
			},
			answers: [],
			tabSwitches: 0,
			secondsUsed: 0,
			submittedAt: new Date().toISOString(),
			interviewRounds: emptyInterviewRounds(),
		};

		await saveResult(placeholderResult);
		return NextResponse.json(
			{ candidate, result: placeholderResult },
			{ status: 201 },
		);
	} catch (err: any) {
		const msg =
			err instanceof Error ? err.message : "Failed to pre-register candidate";
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
