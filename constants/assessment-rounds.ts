import type { QuestionType } from "@/types";
import { isITRole } from "@/constants/roles";

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
		label: "Multiple Choice",
		types: ["mcq_single", "mcq_multi", "output_prediction"],
		limit: 20,
		durationSeconds: 20 * 60,
		audience: "all",
	},
	{
		id: 2,
		label: "Coding",
		types: ["coding"],
		limit: 3,
		durationSeconds: 20 * 60,
		audience: "it",
	},
	{
		id: 3,
		label: "SQL",
		types: ["sql"],
		limit: 2,
		durationSeconds: 10 * 60,
		audience: "it",
	},
	{
		id: 4,
		label: "Subjective",
		types: ["subjective"],
		limit: 3,
		durationSeconds: 15 * 60,
		audience: "it",
	},
];

export function getAssessmentRounds(role: string) {
	return ASSESSMENT_ROUNDS.filter(
		(round) => round.audience === "all" || isITRole(role),
	).map((round) =>
		round.id === 1 && !isITRole(role) ? { ...round, limit: 50 } : round,
	);
}
