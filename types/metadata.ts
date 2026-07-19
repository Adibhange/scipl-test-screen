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
