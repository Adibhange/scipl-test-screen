export type MCQOption = { id: string; text: string };

export type QuestionType =
	| "mcq_single"
	| "mcq_multi"
	| "output_prediction"
	| "coding"
	| "sql"
	| "subjective";

export type Question = {
	id: string;
	type: QuestionType;
	topic: string;
	marks: number;
	role: string;
	experience: string;
	difficulty: string;
	stem: string;
	code?: string;
	options?: MCQOption[];
	correctOptionId?: string;
	correctOptionIds?: string[];
	starterCode?: string;
	testCasesVisible?: { input: string; expected: string }[];
	hiddenCount?: number;
};

export type AdminRole = "hr" | "interviewer" | "director";

// ─── Question Papers ────────────────────────────────────────────────────────

export type QuestionPaperStatus =
	| "draft"
	| "submitted_for_approval"
	| "rejected"
	| "published"
	| "archived";

/** A single option inside a paper item. */
export type PaperItemOption = {
	key: string;
	text: string;
	isCorrect: boolean; // only exposed to HR/Interviewer; never sent to candidates
};

/** A question row inside a question paper. */
export type QuestionPaperItem = {
	id: string;
	questionKey: string;
	questionType: QuestionType;
	questionText: string;
	marks: number;
	section?: string;
	derivedSection?: string;
	codeLanguage?: string;
	expectedAnswer?: string; // only exposed to HR/Interviewer; never sent to candidates
	options?: PaperItemOption[];
	sortOrder: number;
};

/** Metadata record for a question paper. */
export type QuestionPaper = {
	id: string;
	title: string;
	roleId: string;
	experienceId: string;
	status: QuestionPaperStatus;
	uploadedBy: string;
	uploadedByName: string;
	rejectionReason?: string;
	approvedBy?: string;
	approvedByName?: string;
	approvedAt?: string;
	publishedAt?: string;
	archivedAt?: string;
	archivedBy?: string;
	archivedByName?: string;
	totalQuestions: number;
	totalMarks: number;
	questionCountByType: Record<string, number>;
	version: number;
	items?: QuestionPaperItem[]; // present only in detail fetch
	createdAt: string;
	updatedAt: string;
};

/**
 * Immutable per-candidate snapshot of the paper assigned at session creation.
 * Correct answers and expected_answer are stored here server-side but must
 * never be sent to the candidate.
 */
export type CandidateAssessmentSnapshot = {
	id: string;
	sessionId: string;
	paperId: string;
	/** Ordered array of question_paper_items.id in the candidate's shuffled order. */
	questionOrder: string[];
	/** Per-MCQ item: { [itemId]: [optionKey, ...] } in the candidate's shuffled order. */
	optionOrder: Record<string, string[]>;
	/**
	 * Full copy of the paper items at snapshot creation time.
	 * Includes is_correct / expected_answer — these must be stripped before
	 * serving to candidates.
	 */
	snapshotItems: QuestionPaperItem[];
	createdAt: string;
};

/** Validated payload returned by parseAndValidateExcel. */
export type ValidatedPaperPayload = {
	items: Omit<QuestionPaperItem, "id" | "sortOrder">[];
	totalQuestions: number;
	totalMarks: number;
	questionCountByType: Record<string, number>;
	sectionTotals?: Record<string, { questions: number; marks: number }>;
};

