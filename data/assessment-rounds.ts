import type { QuestionType } from "@/types";
import { isITRole } from "@/data/roles";

export type AssessmentRound = {
	id: number;
	label: string;
	types: QuestionType[];
	limit: number;
	durationSeconds: number;
	audience: "all" | "it";
};

export const ASSESSMENT_ROUNDS: AssessmentRound[] = [
	{
		id: 1,
		label: "MCQ",
		types: ["mcq_single", "mcq_multi", "output_prediction"],
		limit: 20,
		durationSeconds: 20 * 60,
		audience: "all",
	},
	{
		id: 2,
		label: "Subjective",
		types: ["subjective"],
		limit: 3,
		durationSeconds: 30 * 60,
		audience: "it",
	},
	{
		id: 3,
		label: "Coding",
		types: ["coding", "sql"],
		limit: 5,
		durationSeconds: 60 * 60,
		audience: "it",
	},
];

export function getAssessmentRounds(role: string) {
	return ASSESSMENT_ROUNDS.filter(
		(round) => round.audience === "all" || isITRole(role),
	);
}
