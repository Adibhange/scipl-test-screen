import { getAllQuestions } from "@/repositories/question.repository";
import { getResultById, updateResult, saveResult, getAllResults } from "@/repositories/result.repository";
import { getCandidateById } from "@/repositories/candidate.repository";
import { getExamSession } from "@/repositories/exam-session.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ValidationError, NotFoundError, ConflictError, AuthorizationError } from "@/lib/errors";
import { emptyInterviewRounds } from "@/lib/interview-rounds";
import type { Answer, Candidate } from "@/types";

/**
 * Service to handle MCQ/manual answer grading, final score calculations, and result submissions.
 */
export async function gradeCandidateAnswer(
	resultId: string,
	questionId: string,
	grade: string,
) {
	// Verify candidate answer exists using adapter
	const answerRow = await getDatabaseAdapter().results.getCandidateAnswer(resultId, questionId);

	if (!answerRow) {
		throw new NotFoundError("Candidate answer not found");
	}

	// Lookup the question details to find maximum possible marks
	const questions = await getAllQuestions();
	const question = questions.find((q) => q.id === questionId);
	const maxMarks = question ? question.marks : 0;

	// Calculate marks awarded based on grade
	const marksAwarded =
		grade === "correct" ? maxMarks
		: grade === "partial" ? maxMarks / 2
		: 0;

	// Mutate candidate answer directly using adapter
	await getDatabaseAdapter().results.updateCandidateAnswer(resultId, questionId, {
		admin_grade: grade,
		marks_awarded: marksAwarded,
	});

	// Reset finalized total score fields in results table so they can be re-resolved
	await updateResult(resultId, (currentResult) => ({
		...currentResult,
		totalMarksAwarded: undefined,
		totalMarksPossible: undefined,
		scoreBreakdown: undefined,
	}));

	// Return the newly updated CandidateResult representation
	const updatedResult = await getResultById(resultId);
	if (!updatedResult) {
		throw new NotFoundError("Failed to reload updated result");
	}

	return updatedResult;
}

export async function calculateCandidateResults(id: string) {
	const result = await getResultById(id);

	if (!result) {
		throw new NotFoundError("Result not found");
	}

	if (result.totalMarksAwarded !== undefined) {
		throw new ConflictError("Assessment already finalized");
	}

	const questions = await getAllQuestions();
	const questionById = new Map(
		questions.map((question) => [question.id, question]),
	);

	interface Accumulator {
		awarded: number;
		possible: number;
		breakdown: {
			mcq: { awarded: number; possible: number };
			coding: { awarded: number; possible: number };
			sql: { awarded: number; possible: number };
			subjective: { awarded: number; possible: number };
		};
	}

	const totals = result.answers.reduce<Accumulator>(
		(current, answer: Answer) => {
			const question = questionById.get(answer.questionId);
			if (!question) return current;

			const marks = question.marks;
			const isManual =
				answer.questionType === "coding" ||
				answer.questionType === "sql" ||
				answer.questionType === "subjective";
			const awarded =
				isManual ?
					answer.adminGrade === "correct" ? marks
					: answer.adminGrade === "partial" ? marks / 2
					: 0
				: answer.isCorrect ? marks
				: 0;

			const category = (
				(
					answer.questionType === "mcq_single" ||
					answer.questionType === "mcq_multi" ||
					answer.questionType === "output_prediction"
				) ?
					"mcq"
				:	answer.questionType
			) as keyof Accumulator["breakdown"];

			return {
				awarded: current.awarded + awarded,
				possible: current.possible + marks,
				breakdown: {
					...current.breakdown,
					[category]: {
						awarded: current.breakdown[category].awarded + awarded,
						possible: current.breakdown[category].possible + marks,
					},
				},
			};
		},
		{
			awarded: 0,
			possible: 0,
			breakdown: {
				mcq: { awarded: 0, possible: 0 },
				coding: { awarded: 0, possible: 0 },
				sql: { awarded: 0, possible: 0 },
				subjective: { awarded: 0, possible: 0 },
			},
		},
	);

	const tabSwitchDeduction = result.tabSwitches * 10;
	const finalScore = Math.max(0, totals.awarded - tabSwitchDeduction);

	const updated = await updateResult(id, (currentResult) => ({
		...currentResult,
		totalMarksAwarded: finalScore,
		totalMarksPossible: totals.possible,
		scoreBreakdown: {
			...totals.breakdown,
			scoreBeforeDeduction: totals.awarded,
			tabSwitchDeduction,
		},
	}));

	return updated;
}

export async function submitResults(body: {
	candidate?: Candidate;
	answers?: Answer[];
	tabSwitches?: number;
	secondsUsed?: number;
}) {
	if (!body.candidate?.id || !Array.isArray(body.answers)) {
		throw new ValidationError("A saved candidate and answers are required.");
	}

	const savedCandidate = await getCandidateById(body.candidate.id);
	if (
		!savedCandidate ||
		savedCandidate.email.toLowerCase() !==
			body.candidate.email.trim().toLowerCase()
	) {
		throw new AuthorizationError("Candidate email does not match the registered application.");
	}

	// Find exam session corresponding to this candidate
	const session = await getExamSession(savedCandidate.id);

	if (!session) {
		throw new NotFoundError("Exam session not found");
	}

	// Try to load any pre-existing placeholder result record created at registration
	const existingResult = await getResultById(session.id);

	const result = {
		id: session.id, // session ID
		candidate: {
			...body.candidate,
			id: savedCandidate.id,
			email: savedCandidate.email,
			name: `${savedCandidate.firstName} ${savedCandidate.lastName}`.trim(),
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
	return result;
}

export async function fetchAllResultsList() {
	return getAllResults();
}
