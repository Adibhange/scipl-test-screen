import { NextRequest, NextResponse } from "next/server";
import { getAllResults, getResultById, saveResult } from "@/lib/results";
import { getCandidateById } from "@/lib/db";
import type { Answer, Candidate } from "@/types";
import { emptyInterviewRounds } from "@/lib/interview-rounds";

export async function GET() {
	try {
		return NextResponse.json(await getAllResults());
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not load results";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const body: {
			candidate?: Candidate;
			answers?: Answer[];
			tabSwitches?: number;
			secondsUsed?: number;
		} = await req.json();

		if (!body.candidate?.id || !Array.isArray(body.answers)) {
			return NextResponse.json(
				{ error: "A saved candidate and answers are required." },
				{ status: 400 },
			);
		}
		const savedCandidate = await getCandidateById(body.candidate.id);
		if (
			!savedCandidate ||
			savedCandidate.email.toLowerCase() !==
				body.candidate.email.trim().toLowerCase()
		) {
			return NextResponse.json(
				{
					error:
						"Candidate email does not match the registered application.",
				},
				{ status: 403 },
			);
		}

		// Try to load any pre-existing placeholder result record created at registration
		const existingResult = await getResultById(savedCandidate.id);

		const result = {
			id: savedCandidate.id,
			candidate: {
				...body.candidate,
				id: savedCandidate.id,
				email: savedCandidate.email,
				name: savedCandidate.name,
				mobile: savedCandidate.mobile,
				role: savedCandidate.role,
				experience: savedCandidate.experience,
				testLocation: savedCandidate.testLocation,
				hiringLocation:
					savedCandidate.hiringLocation ||
					existingResult?.candidate.hiringLocation,
				hiringStatus:
					savedCandidate.hiringStatus ||
					existingResult?.candidate.hiringStatus ||
					"screening",
			},
			answers: body.answers,
			tabSwitches: body.tabSwitches ?? 0,
			secondsUsed: body.secondsUsed ?? 0,
			submittedAt: new Date().toISOString(),
			interviewRounds: {
				...emptyInterviewRounds(),
				...(existingResult?.interviewRounds ?? {}),
				face_to_face: existingResult?.interviewRounds?.face_to_face ?? {
					status: "pass",
				},
				assessment: { status: "pending" as const },
			},
			assignedInterviewerId: existingResult?.assignedInterviewerId,
			assignedInterviewerName: existingResult?.assignedInterviewerName,
			assignedInterviewerEmail: existingResult?.assignedInterviewerEmail,
		};

		await saveResult(result);
		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not save assessment result";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
