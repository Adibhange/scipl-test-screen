import { getDatabaseAdapter } from "@/database/client";
import type { CandidateAssessmentSnapshot, QuestionPaperItem } from "@/types";

function mapSnapshot(row: any): CandidateAssessmentSnapshot {
	return {
		id: row.id,
		sessionId: row.session_id,
		paperId: row.paper_id,
		questionOrder: row.question_order as string[],
		optionOrder: row.option_order as Record<string, string[]>,
		snapshotItems: (row.snapshot_items as any[]).map((item: any): QuestionPaperItem => ({
			id: item.id,
			questionKey: item.question_key,
			questionType: item.question_type,
			questionText: item.question_text,
			marks: Number(item.marks),
			section: item.section ?? undefined,
			codeLanguage: item.code_language ?? undefined,
			expectedAnswer: item.expected_answer ?? undefined,
			options: item.options ?? undefined,
			sortOrder: item.sort_order,
		})),
		createdAt: row.created_at,
	};
}

/**
 * Creates an immutable assessment snapshot for a candidate session.
 * The UNIQUE constraint on session_id ensures this is only ever created once.
 * If a snapshot already exists for this session_id the call will fail silently
 * — the caller must check before calling to avoid a DB error.
 */
export async function createAssessmentSnapshot(data: {
	sessionId: string;
	paperId: string;
	questionOrder: string[];
	optionOrder: Record<string, string[]>;
	snapshotItems: QuestionPaperItem[];
}): Promise<CandidateAssessmentSnapshot> {
	// Convert typed items to the storage format used in the JSON column
	const storageItems = data.snapshotItems.map((item) => ({
		id: item.id,
		question_key: item.questionKey,
		question_type: item.questionType,
		question_text: item.questionText,
		marks: item.marks,
		section: item.section ?? null,
		code_language: item.codeLanguage ?? null,
		expected_answer: item.expectedAnswer ?? null,
		options: item.options ?? null,
		sort_order: item.sortOrder,
	}));

	const row = await getDatabaseAdapter().assessmentSnapshots.create({
		session_id: data.sessionId,
		paper_id: data.paperId,
		question_order: data.questionOrder,
		option_order: data.optionOrder,
		snapshot_items: storageItems,
	});

	return mapSnapshot(row);
}

/**
 * Returns the candidate's assessment snapshot for a given session, or null
 * when the session pre-dates the Question Papers feature (legacy path).
 */
export async function getSnapshotBySessionId(
	sessionId: string,
): Promise<CandidateAssessmentSnapshot | null> {
	const row = await getDatabaseAdapter().assessmentSnapshots.getBySessionId(sessionId);
	if (!row) return null;
	return mapSnapshot(row);
}
