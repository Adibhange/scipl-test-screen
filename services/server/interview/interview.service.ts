/* eslint-disable @typescript-eslint/no-explicit-any */
import { getResultById, updateResult } from "@/repositories/result.repository";
import { canReviewRound } from "@/repositories/admin.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ensureInterviewRounds } from "@/lib/interview-rounds";
import { ValidationError, NotFoundError, AuthorizationError, ConflictError } from "@/lib/errors";
import type { InterviewDecision, InterviewRoundKey } from "@/types";

/**
 * Service to handle interviewer assignments and multi-round transition workflows.
 */
export async function submitRoundFeedback(
	resultId: string,
	round: InterviewRoundKey,
	status: InterviewDecision,
	remarks: string | undefined,
	admin: { userId: string; name: string; email: string; role: string },
) {
	if (!["face_to_face", "assessment", "director"].includes(round) || !["pending", "pass", "fail"].includes(status)) {
		throw new ValidationError("Invalid round review");
	}

	if (!canReviewRound(admin.role as any, round)) {
		throw new AuthorizationError("You cannot review this round");
	}

	const result = await getResultById(resultId);
	if (!result) {
		throw new NotFoundError("Candidate result not found");
	}

	if (admin.role === "interviewer" && result.assignedInterviewerId !== admin.userId) {
		throw new AuthorizationError("Candidate is not assigned to you");
	}

	const rounds = ensureInterviewRounds(result);
	const sequence: InterviewRoundKey[] = ["face_to_face", "assessment", "director"];
	const index = sequence.indexOf(round);

	for (let i = 0; i < index; i++) {
		if (rounds[sequence[i]].status === "fail") {
			throw new ValidationError("Cannot update feedback: a previous round in the sequence is marked as FAIL.");
		}
	}

	if (index > 0 && rounds[sequence[index - 1]].status !== "pass") {
		throw new ConflictError("The previous round must be passed first");
	}

	const updated = await updateResult(resultId, (current) => ({
		...current,
		interviewRounds: {
			...ensureInterviewRounds(current),
			[round]: {
				status,
				remarks: remarks?.trim(),
				interviewerId: admin.userId,
				interviewerName: admin.name,
				interviewerEmail: admin.email,
				updatedAt: new Date().toISOString(),
			},
		},
	}));

	return updated;
}

export async function assignInterviewerAndDetails(
	resultId: string,
	body: {
		role?: string;
		experience?: string;
		testLocation?: string;
		hiringLocation?: string;
		hiringStatus?: string;
		expectedSalary?: number | null;
		offerSalary?: number | null;
		hrNotes?: string;
		interviewerId?: string;
		interviewerName?: string;
		interviewerEmail?: string;
	},
) {
	const result = await getResultById(resultId);
	if (!result) {
		throw new NotFoundError("Candidate result not found");
	}

	let interviewerId = body.interviewerId;
	let interviewerName = body.interviewerName;
	let interviewerEmail = body.interviewerEmail;

	if (!interviewerId && body.interviewerEmail) {
		const adminUsers = await getDatabaseAdapter().admins.getAll();
		const interviewer = adminUsers.find(
			(u: any) => u.email.toLowerCase() === body.interviewerEmail!.trim().toLowerCase() && u.role === "interviewer",
		);
		if (!interviewer) {
			throw new ValidationError("No interviewer account found for that email");
		}
		interviewerId = interviewer.user_id;
		interviewerName = interviewer.name;
		interviewerEmail = interviewer.email;
	}

	const updated = await updateResult(resultId, (current) => ({
		...current,
		candidate: {
			...current.candidate,
			...(body.role ? { role: body.role } : {}),
			...(body.experience ? { experience: body.experience } : {}),
			...(body.testLocation ? { testLocation: body.testLocation as any } : {}),
			...(body.hiringLocation !== undefined ? { hiringLocation: body.hiringLocation || undefined } : {}),
			...(body.hiringStatus ? { hiringStatus: body.hiringStatus as any } : {}),
			...(body.expectedSalary !== undefined ? { expectedSalary: body.expectedSalary ?? undefined } : {}),
			...(body.offerSalary !== undefined ? { offerSalary: body.offerSalary ?? undefined } : {}),
			...(body.hrNotes !== undefined ? { hrNotes: body.hrNotes } : {}),
		},
		assignedInterviewerId: interviewerId,
		assignedInterviewerName: interviewerName,
		assignedInterviewerEmail: interviewerEmail,
	}));

	if (result.candidate.id && (
		body.role !== undefined ||
		body.experience !== undefined ||
		body.testLocation !== undefined ||
		body.hiringLocation !== undefined ||
		body.hiringStatus !== undefined ||
		body.expectedSalary !== undefined ||
		body.offerSalary !== undefined ||
		body.hrNotes !== undefined
	)) {
		const metadataAdapter = getDatabaseAdapter().metadata;
		const candidateUpdates: any = {};

		if (body.role !== undefined) {
			const rd = await metadataAdapter.resolveRoleValue(body.role.trim());
			if (rd) candidateUpdates.role = rd.id;
		}
		if (body.experience !== undefined) {
			const ed = await metadataAdapter.resolveExperienceValue(body.experience.trim());
			if (ed) candidateUpdates.experience = ed.id;
		}
		if (body.testLocation !== undefined) {
			const td = await metadataAdapter.resolveTestLocationValue(body.testLocation.trim());
			if (td) candidateUpdates.test_location = td.id;
		}
		if (body.hiringLocation !== undefined) {
			if (body.hiringLocation) {
				const hd = await metadataAdapter.resolveHiringLocationValue(body.hiringLocation.trim());
				candidateUpdates.hiring_location = hd?.id || body.hiringLocation;
			} else {
				candidateUpdates.hiring_location = null;
			}
		}
		if (body.hiringStatus !== undefined) candidateUpdates.hiring_status = body.hiringStatus;
		if (body.expectedSalary !== undefined) candidateUpdates.expected_salary = body.expectedSalary;
		if (body.offerSalary !== undefined) candidateUpdates.offer_salary = body.offerSalary;
		if (body.hrNotes !== undefined) candidateUpdates.hr_notes = body.hrNotes;

		await getDatabaseAdapter().candidates.update(result.candidate.id, candidateUpdates);

		// Sync exam_sessions configuration values as well
		if (candidateUpdates.role || candidateUpdates.experience) {
			const sessionUpdates: any = {};
			if (candidateUpdates.role) sessionUpdates.role = candidateUpdates.role;
			if (candidateUpdates.experience) sessionUpdates.experience = candidateUpdates.experience;

			const session = await getDatabaseAdapter().examSessions.getByCandidateId(result.candidate.id);
			if (session) {
				await getDatabaseAdapter().examSessions.update(session.id, sessionUpdates);
			}
		}
	}

	return updated;
}
