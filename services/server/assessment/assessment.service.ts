/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAssessmentQuestions, getQuestionsByRoleAndExperience } from "@/repositories/question.repository";
import { getSnapshotBySessionId } from "@/repositories/assessment-snapshot.repository";
import { ValidationError } from "@/lib/errors";
import type { Question, QuestionPaperItem, PaperItemOption } from "@/types";

/**
 * Service to handle assessment question selections and configurations.
 *
 * Priority:
 * 1. If sessionId is provided and a snapshot exists → return questions from the
 *    immutable snapshot in the candidate's shuffled order, with correct answers
 *    stripped. This is the canonical path for new candidates.
 * 2. Fallback → legacy JSON-based question fetch for sessions without paper_id.
 */
export async function getQuestionsForAssessment(
	role: string,
	experience: string,
	all: boolean,
	sessionId?: string,
): Promise<Question[]> {
	if (!role || !experience) {
		throw new ValidationError("role and experience parameters are required");
	}

	// --- Snapshot path (new candidates with a published paper) ---
	if (sessionId) {
		const snapshot = await getSnapshotBySessionId(sessionId);
		if (snapshot && snapshot.snapshotItems.length > 0) {
			return buildQuestionsFromSnapshot(snapshot.snapshotItems, snapshot.questionOrder, snapshot.optionOrder);
		}
	}

	// --- Legacy path (pre-migration sessions or no published paper for role/exp) ---
	if (all) {
		return getQuestionsByRoleAndExperience(role, experience);
	}
	return getAssessmentQuestions(role, experience);
}

/**
 * Converts snapshot items to the Question type expected by the candidate UI,
 * applying the shuffled order and stripping correct-answer data.
 *
 * IMPORTANT: is_correct, expectedAnswer, and raw options.isCorrect are NEVER
 * included in the returned objects.
 */
function buildQuestionsFromSnapshot(
	items: QuestionPaperItem[],
	questionOrder: string[],
	optionOrder: Record<string, string[]>,
): Question[] {
	// Build a lookup by ID for fast ordering
	const itemById = new Map(items.map((item) => [item.id, item]));

	return questionOrder
		.map((itemId) => itemById.get(itemId))
		.filter((item): item is QuestionPaperItem => Boolean(item))
		.map((item) => snapshotItemToQuestion(item, optionOrder[item.id]));
}

function snapshotItemToQuestion(item: QuestionPaperItem, shuffledOptionKeys?: string[]): Question {
	const isMCQ = ["mcq_single", "mcq_multi", "output_prediction"].includes(item.questionType);

	// Build options in the per-candidate shuffled order; strip isCorrect
	let candidateOptions: { id: string; text: string }[] | undefined;
	if (isMCQ && item.options && item.options.length > 0) {
		const optionByKey = new Map(item.options.map((o: PaperItemOption) => [o.key, o]));
		const orderedKeys = shuffledOptionKeys ?? item.options.map((o: PaperItemOption) => o.key);
		candidateOptions = orderedKeys
			.map((key) => optionByKey.get(key))
			.filter((o): o is PaperItemOption => Boolean(o))
			.map((o) => ({ id: o.key, text: o.text })); // isCorrect intentionally excluded
	}

	return {
		id: item.id,
		type: item.questionType,
		topic: item.section ?? item.questionType,
		marks: item.marks,
		role: "", // Not required by candidate UI; snapshot is already role-scoped
		experience: "",
		difficulty: "",
		stem: item.questionText,
		code: undefined,
		options: candidateOptions,
		// correctOptionId / correctOptionIds intentionally NOT set
		starterCode: item.questionType === "coding" ? undefined : undefined,
	};
}
