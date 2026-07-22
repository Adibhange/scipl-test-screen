/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	createCandidate,
	checkReapplicationLockout,
} from "@/repositories/candidate.repository";
import { getExamSession } from "@/repositories/exam-session.repository";
import { getResultById, saveResult } from "@/repositories/result.repository";
import { getMetadata, getVacancies } from "@/repositories/metadata.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ValidationError, AuthorizationError } from "@/lib/errors";
import { emptyInterviewRounds } from "@/lib/interview-rounds";

/**
 * Service to handle candidate lifecycle, validations, reapplication checks, and pre-registration.
 */
export async function getCandidateWithSessionValidation(
	email: string,
	role?: string,
	experience?: string,
) {
	// Query candidates joining master config lookups and selecting split names
	const candidateRow = await getDatabaseAdapter().candidates.getWithDetailsByEmail(email);

	if (!candidateRow) {
		throw new AuthorizationError("You are not pre-registered. Please contact HR.");
	}

	const roleVal = candidateRow.roleObj?.value || "";
	const expVal = candidateRow.experienceObj?.value || "";
	const testLocVal = candidateRow.testLocObj?.value || "home";

	if (role && experience) {
		if (roleVal.toLowerCase().trim() !== role.toLowerCase().trim() || expVal.toLowerCase().trim() !== experience.toLowerCase().trim()) {
			throw new AuthorizationError(`Mismatch: You are registered for the "${roleVal}" role with "${expVal}" years of experience. Please select these options.`);
		}
	}

	// Look up session by candidate id
	const session = await getExamSession(candidateRow.id);

	if (!session) {
		throw new AuthorizationError("No active exam session found. Please contact HR.");
	}

	const resultRecord = await getResultById(session.id);

	if (!resultRecord) {
		throw new AuthorizationError("No screening review found. Please contact HR.");
	}

	const rounds = resultRecord.interviewRounds || {};
	const hasFailed = Object.values(rounds).some((r: any) => r?.status === "fail");
	if (hasFailed) {
		throw new AuthorizationError("Application Process Terminated");
	}

	const faceToFaceStatus = (rounds as any)?.face_to_face?.status;
	if (faceToFaceStatus !== "pass") {
		throw new AuthorizationError("You have not cleared the face-to-face screening round yet.");
	}

	return {
		completed: session.is_exam_submitted === true,
		candidate: {
			id: candidateRow.id,
			name: `${candidateRow.first_name} ${candidateRow.last_name}`.trim(),
			mobile: candidateRow.mobile,
			role: roleVal,
			experience: expVal,
			testLocation: testLocVal,
		},
	};
}

export async function processCandidateIntake(
	email: string,
	vacancyId: string,
) {
	// Query candidates joining master config lookups and selecting split names
	const existingRow = await getDatabaseAdapter().candidates.getWithDetailsByEmail(email);

	if (!existingRow) {
		throw new AuthorizationError("You are not pre-registered. Please contact HR.");
	}

	const roleVal = existingRow.roleObj?.value || "";
	const expVal = existingRow.experienceObj?.value || "";
	const testLocVal = existingRow.testLocObj?.value || "home";
	const hiringLocVal = existingRow.hiringLocObj?.value || undefined;

	if (existingRow.vacancy_id !== vacancyId) {
		throw new AuthorizationError("Mismatch: You are registered for a different vacancy. Please contact HR or select the correct vacancy.");
	}

	// Check 3-month reapplication lockout gateway
	const hasLockout = await checkReapplicationLockout(
		email,
		existingRow.mobile,
		existingRow.roleObj?.id,
		existingRow.id,
	);

	if (hasLockout) {
		throw new ValidationError("Application restriction: You have already applied for this position within the last 3 months.");
	}

	// Lookup session for candidate
	const session = await getExamSession(existingRow.id);

	if (!session) {
		throw new AuthorizationError("No active exam session found. Please contact HR.");
	}

	const resultRecord = await getResultById(session.id);

	if (!resultRecord) {
		throw new AuthorizationError("No screening review found. Please contact HR.");
	}

	const rounds = resultRecord.interviewRounds || {};
	const faceToFaceStatus = (rounds as any)?.face_to_face?.status;

	if (faceToFaceStatus !== "pass") {
		throw new AuthorizationError("You have not cleared the face-to-face screening round yet.");
	}

	if (session.is_exam_submitted === true) {
		throw new AuthorizationError("You have already completed the assessment for this specific vacancy.");
	}

	// Generate new session token (takeover active session)
	const newToken = `${existingRow.id}-${Date.now()}`;
	
	// Directly update the active session token on the database layer
	await getDatabaseAdapter().examSessions.update(session.id, {
		active_session_token: newToken,
	});

	return {
		id: existingRow.id,
		name: `${existingRow.first_name} ${existingRow.last_name}`.trim(),
		mobile: existingRow.mobile,
		email: existingRow.email,
		role: roleVal,
		experience: expVal,
		testLocation: testLocVal,
		hiringLocation: hiringLocVal,
		hiringStatus: existingRow.hiring_status ?? "screening",
		active_session_token: newToken,
	};
}

export async function preRegisterCandidateByAdmin(input: {
	firstName: string;
	lastName: string;
	mobile: string;
	email: string;
	role: string;
	experience: string;
	testLocation?: string;
	hiringLocation?: string;
	vacancyId?: string;
	experiences?: any[];
	references?: any[];
}) {
	// 1. Resolve role & experience values to UUIDs using metadata adapter
	const metadataAdapter = getDatabaseAdapter().metadata;
	const roleData = await metadataAdapter.resolveRoleValue(input.role);
	const expData = await metadataAdapter.resolveExperienceValue(input.experience);

	if (!roleData || !expData) {
		throw new ValidationError("Could not resolve role or experience pre-registration master values");
	}

	// 2. Implement the 3-month reapplication lockout gateway
	const hasLockout = await checkReapplicationLockout(
		input.email,
		input.mobile,
		roleData.id,
	);

	if (hasLockout) {
		throw new ValidationError("Application restriction: This candidate has already applied for this position within the last 3 months.");
	}

	// 3. Create candidate record in database
	const candidate = await createCandidate(input);

	// 4. Create exam session record using adapter (using boolean types)
	const session = await getDatabaseAdapter().examSessions.create({
		candidate_id: candidate.id,
		role: roleData.id,
		experience: expData.id,
		is_exam_started: false,
		is_exam_submitted: false,
		active_session_token: `${candidate.id}-${Date.now()}`,
		seconds_used: 0,
	});

	if (!session) {
		throw new ValidationError("Could not create exam session");
	}

	// 5. Create placeholder result record mapped to the exam session
	const placeholderResult = {
		id: session.id, // Map directly to exam_sessions.id
		candidate: {
			id: candidate.id,
			name: `${candidate.firstName} ${candidate.lastName}`.trim(),
			mobile: candidate.mobile,
			email: candidate.email,
			role: candidate.role,
			experience: candidate.experience,
			testLocation: candidate.testLocation,
			hiringLocation: candidate.hiringLocation,
			hiringStatus: "screening" as const,
			vacancyId: candidate.vacancyId,
		},
		answers: [],
		tabSwitches: 0,
		secondsUsed: 0,
		submittedAt: new Date().toISOString(),
		interviewRounds: emptyInterviewRounds(),
	};

	await saveResult(placeholderResult);

	return { candidate, result: placeholderResult };
}

export async function getMetadataAndVacancies() {
	const meta = await getMetadata(true);
	const vacancies = await getVacancies(true);
	return {
		roles: meta.roles,
		experience: meta.experience,
		testLocations: meta.testLocations,
		hiringLocations: meta.hiringLocations,
		vacancies,
	};
}
