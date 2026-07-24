/* eslint-disable @typescript-eslint/no-explicit-any */
import { getResultById, updateResult } from "@/repositories/result.repository";
import { canReviewRound } from "@/repositories/admin.repository";
import { updateCandidate } from "@/repositories/candidate.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ensureInterviewRounds, canSubmitFeedback, calculateCandidateWorkflowStatus } from "@/lib/interview-workflow";
import { ValidationError, NotFoundError, AuthorizationError, ConflictError } from "@/lib/errors";
import type { InterviewDecision, InterviewRoundKey } from "@/types";

/**
 * Service to handle interviewer assignments and multi-round transition workflows.
 */
export async function submitRoundFeedback(
	resultId: string,
	round: InterviewRoundKey,
	status?: InterviewDecision,
	remarks?: string,
	admin?: any,
	decision?: "hire" | "reject" | "hold" | null,
	directorId?: string,
	reopenReason?: string,
) {
	if (!["face_to_face", "assessment", "director"].includes(round)) {
		throw new ValidationError("Invalid round review");
	}

	if (round !== "director" && (!status || !["pending", "pass", "fail"].includes(status))) {
		throw new ValidationError("Evaluation status is required for this round.");
	}

	if (decision && !["hire", "reject", "hold"].includes(decision)) {
		throw new ValidationError("Invalid decision value");
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

	if (!canSubmitFeedback(result, round, decision)) {
		throw new ConflictError("The workflow progression requirements for this round are not met.");
	}

	const rounds = ensureInterviewRounds(result);

	// Immutability checks for Round 1 & Round 2 feedback
	if (round === "face_to_face" || round === "assessment") {
		const existingStatus = rounds[round]?.status;
		if (existingStatus === "pass" || existingStatus === "fail") {
			throw new ConflictError(`Cannot modify feedback: ${round === "face_to_face" ? "Face-to-Face" : "Technical Assessment"} review is already submitted and locked.`);
		}
	}

	// Director Decision attribution and reopening check
	let decisionByDirectorId: string | undefined = undefined;
	let decisionByDirectorName: string | undefined = undefined;
	let decisionByDirectorEmail: string | undefined = undefined;
	let recordedBy: any = undefined;
	let isReopening = false;

	if (round === "director") {
		// Reopen check
		if (result.directorDecision && ["hire", "reject", "hold"].includes(result.directorDecision)) {
			if (admin.role !== "hr") {
				throw new AuthorizationError("Only HR administrators can reopen a finalized Director decision.");
			}
			if (!reopenReason || !reopenReason.trim()) {
				throw new ValidationError("A reopen reason is required to modify a finalized Director decision.");
			}
			isReopening = true;
		}

		if (admin.role === "director") {
			decisionByDirectorId = admin.userId;
			decisionByDirectorName = admin.name;
			decisionByDirectorEmail = admin.email;
			recordedBy = { id: admin.userId, name: admin.name, email: admin.email, role: admin.role };
		} else if (admin.role === "hr") {
			if (!directorId) {
				throw new ValidationError("A Director must be selected when HR records the decision.");
			}
			const adminUsers = await getDatabaseAdapter().admins.getAll();
			const director = adminUsers.find((u: any) => u.user_id === directorId && u.role === "director");
			if (!director) {
				throw new ValidationError("Invalid or inactive Director selected.");
			}
			decisionByDirectorId = director.user_id;
			decisionByDirectorName = director.name;
			decisionByDirectorEmail = director.email;
			recordedBy = { id: admin.userId, name: admin.name, email: admin.email, role: admin.role };
		} else {
			throw new AuthorizationError("You are not authorized to submit a Director decision.");
		}
	}

	const updated = await updateResult(resultId, (current) => {
		const nextRounds = {
			...ensureInterviewRounds(current),
			[round]: {
				...ensureInterviewRounds(current)[round],
				...(round !== "director" ? { status: status! } : {}),
				remarks: remarks?.trim(),
				interviewerId: admin.userId,
				interviewerName: admin.name,
				interviewerEmail: admin.email,
				updatedAt: new Date().toISOString(),
				// Attribution info
				...(round === "director" ? {
					recordedBy,
					decisionByDirectorId,
					decisionByDirectorName,
					decisionByDirectorEmail,
				} : {}),
			},
		};

		if (round === "director" && nextRounds.director) {
			delete (nextRounds.director as any).status;
			if (isReopening) {
				nextRounds.director = {
					...nextRounds.director,
					reopenedAt: new Date().toISOString(),
					reopenReason: reopenReason!.trim(),
					reopenedBy: { id: admin.userId, name: admin.name, email: admin.email, role: admin.role }
				};
			}
		}

		return {
			...current,
			interviewRounds: nextRounds,
			directorDecision: round === "director" ? (decision || null) : current.directorDecision,
		};
	});

	if (updated?.candidate?.id) {
		const computedStatus = calculateCandidateWorkflowStatus(updated);
		await updateCandidate(updated.candidate.id, { hiringStatus: computedStatus });
	}

	// Reload the latest result from the database to ensure we get the updated hiring status (which is updated by PostgreSQL triggers)
	const fresh = await getResultById(resultId);
	return fresh || updated;
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
		experiences?: any[];
		references?: any[];
		round?: string;
	},
) {
	const result = await getResultById(resultId);
	if (!result) {
		throw new NotFoundError("Candidate result not found");
	}

	// Immutability check for Round 1 & Round 2 interviewer assignment
	if (body.round && ["face_to_face", "assessment"].includes(body.round)) {
		const rounds = ensureInterviewRounds(result);
		const existingStatus = rounds[body.round as InterviewRoundKey]?.status;
		if (existingStatus === "pass" || existingStatus === "fail") {
			throw new ConflictError(`Cannot change interviewer: ${body.round === "face_to_face" ? "Face-to-Face" : "Technical Assessment"} review is already submitted and locked.`);
		}
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

	// A request that doesn't mention interviewer fields at all (e.g. a
	// hiring-status-only bulk update) must leave the existing assignment
	// untouched — only an explicit interviewerId/interviewerName/interviewerEmail
	// key (even an empty string, meaning "clear it") should change it.
	const interviewerFieldsProvided =
		body.interviewerId !== undefined || body.interviewerName !== undefined || body.interviewerEmail !== undefined;
	if (!interviewerFieldsProvided) {
		interviewerId = result.assignedInterviewerId;
		interviewerName = result.assignedInterviewerName;
		interviewerEmail = result.assignedInterviewerEmail;
	}

	const updated = await updateResult(resultId, (current) => {
		const nextRounds = {
			...ensureInterviewRounds(current),
		};

		if (body.round && ["face_to_face", "assessment", "director"].includes(body.round)) {
			const r = body.round as InterviewRoundKey;
			nextRounds[r] = {
				...nextRounds[r],
				interviewerId: interviewerId || undefined,
				interviewerName: interviewerName || undefined,
				interviewerEmail: interviewerEmail || undefined,
			};
		}

		return {
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
			interviewRounds: nextRounds,
			...(body.round ? {} : {
				assignedInterviewerId: interviewerId,
				assignedInterviewerName: interviewerName,
				assignedInterviewerEmail: interviewerEmail,
			}),
		};
	});

	if (result.candidate.id && (
		body.role !== undefined ||
		body.experience !== undefined ||
		body.testLocation !== undefined ||
		body.hiringLocation !== undefined ||
		body.hiringStatus !== undefined ||
		body.expectedSalary !== undefined ||
		body.offerSalary !== undefined ||
		body.hrNotes !== undefined ||
		body.experiences !== undefined ||
		body.references !== undefined
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
			if (td) candidateUpdates.testLocation = td.id;
		}
		if (body.hiringLocation !== undefined) {
			if (body.hiringLocation) {
				const hd = await metadataAdapter.resolveHiringLocationValue(body.hiringLocation.trim());
				candidateUpdates.hiringLocation = hd?.id || body.hiringLocation;
			} else {
				candidateUpdates.hiringLocation = null;
			}
		}
		if (body.hiringStatus !== undefined) candidateUpdates.hiringStatus = body.hiringStatus;
		if (body.expectedSalary !== undefined) candidateUpdates.expectedSalary = body.expectedSalary;
		if (body.offerSalary !== undefined) candidateUpdates.offerSalary = body.offerSalary;
		if (body.hrNotes !== undefined) candidateUpdates.hrNotes = body.hrNotes;

		if (body.experiences !== undefined) candidateUpdates.experiences = body.experiences;
		if (body.references !== undefined) candidateUpdates.references = body.references;

		await updateCandidate(result.candidate.id, candidateUpdates);

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
