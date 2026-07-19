import { NextResponse } from "next/server";
import { getAllQuestions } from "@/lib/questions";
import { getResultById, updateResult } from "@/lib/results";
import type { Answer } from "@/types";

export async function POST(
	_request: Request,
	context: RouteContext<"/api/results/[id]/calculate">,
) {
	const { id } = await context.params;
	const result = await getResultById(id);

	if (!result) {
		return NextResponse.json({ error: "Result not found" }, { status: 404 });
	}

	if (result.totalMarksAwarded !== undefined) {
		return NextResponse.json(
			{ error: "Assessment already finalized" },
			{ status: 409 },
		);
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

	return NextResponse.json(updated);
}
