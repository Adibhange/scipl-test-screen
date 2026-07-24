/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CandidateResult } from "@/types";
import { getDatabaseAdapter } from "@/database/client";

function mapToCandidateResult(row: any, session: any, candidate: any, answers: any[], tabSwitches: number): CandidateResult {
	const roleObj = candidate ? candidate.role : undefined;
	const experienceObj = candidate ? candidate.experience : undefined;
	const testLocObj = candidate ? candidate.test_location : undefined;
	const hiringLocObj = candidate ? candidate.hiring_location : undefined;

	return {
		id: row.id,
		candidate: {
			id: candidate?.id || "",
			name: `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim(),
			mobile: candidate?.mobile || "",
			email: candidate?.email || "",
			role: roleObj?.value || "",
			experience: experienceObj?.value || "",
			testLocation: testLocObj?.value || "home",
			hiringLocation: hiringLocObj?.value || undefined,
			hiringStatus: candidate?.hiring_status as any,
			expectedSalary: candidate?.expected_salary == null ? undefined : Number(candidate.expected_salary),
			offerSalary: candidate?.offer_salary == null ? undefined : Number(candidate.offer_salary),
			hrNotes: candidate?.hr_notes ?? undefined,
			vacancyId: candidate?.vacancy_id || undefined,
			experiences: candidate?.experiences || [],
			references: candidate?.references || [],
		},
		answers: (answers || []).map(ans => ({
			questionId: ans.question_id,
			questionTopic: ans.question_topic,
			questionType: ans.question_type,
			answerValue: ans.answer_value,
			isCorrect: ans.is_correct ?? undefined,
			adminGrade: ans.admin_grade ?? undefined,
			marksAwarded: ans.marks_awarded != null ? Number(ans.marks_awarded) : undefined,
		})),
		tabSwitches,
		secondsUsed: row.seconds_used,
		submittedAt: row.submitted_at,
		totalMarksAwarded: row.total_marks_awarded != null ? Number(row.total_marks_awarded) : undefined,
		totalMarksPossible: row.total_marks_possible != null ? Number(row.total_marks_possible) : undefined,
		scoreBreakdown: row.score_breakdown ?? undefined,
		interviewRounds: row.interview_rounds ?? undefined,
		assignedInterviewerId: row.assigned_interviewer_id ?? undefined,
		assignedInterviewerName: row.assigned_interviewer_name ?? undefined,
		assignedInterviewerEmail: row.assigned_interviewer_email ?? undefined,
		directorDecision: row.director_decision ?? null,
		isExamStarted: session?.is_exam_started ?? false,
		isExamSubmitted: session?.is_exam_submitted ?? false,
	};
}

export async function getAllResults(): Promise<CandidateResult[]> {
	const data = await getDatabaseAdapter().results.getAll();
	return data.map(item =>
		mapToCandidateResult(item.row, item.session, item.candidate, item.answers, item.tabSwitches),
	);
}

export async function getResultById(id: string): Promise<CandidateResult | undefined> {
	const data = await getDatabaseAdapter().results.getById(id);
	if (!data) return undefined;

	if (data.candidateRow) {
		const candidateId = data.candidateRow.id;
		const experiences = await getDatabaseAdapter().candidateExperiences.getByCandidateId(candidateId);
		const references = await getDatabaseAdapter().candidateReferences.getByCandidateId(candidateId);
		data.candidateRow.experiences = experiences;
		data.candidateRow.references = references;
	}

	return mapToCandidateResult(
		data.resultRow,
		data.sessionRow,
		data.candidateRow,
		data.answers,
		data.tabSwitches,
	);
}

/**
 * Resolves a candidate's assessment result from their candidate id rather
 * than the result/session id. Used by the Master share flow, where the
 * `candidate_shares` row only stores `candidate_id`.
 */
export async function getResultByCandidateId(candidateId: string): Promise<CandidateResult | undefined> {
	const session = await getDatabaseAdapter().examSessions.getByCandidateId(candidateId);
	if (!session?.id) return undefined;
	return getResultById(session.id);
}

export async function saveResult(result: CandidateResult): Promise<void> {
	await getDatabaseAdapter().results.save(result);
}

export async function updateResult(
	id: string,
	updater: (result: CandidateResult) => CandidateResult,
): Promise<CandidateResult | undefined> {
	const existing = await getResultById(id);
	if (!existing) return undefined;

	const updated = updater(existing);
	await saveResult(updated);
	return updated;
}

export async function getProctoringLogsCount(sessionId: string, violationType = "tab_switch"): Promise<number> {
	return getDatabaseAdapter().results.getProctoringLogsCount(sessionId, violationType);
}

export async function insertProctoringLog(sessionId: string, violationType = "tab_switch"): Promise<void> {
	await getDatabaseAdapter().results.insertProctoringLog(sessionId, violationType);
}
