import { z } from "zod";

export const CalculateResultScoreSchema = z.object({
	id: z.string().trim().min(1, "Result ID is required"),
});

const AnswerValueSchema = z.union([z.string(), z.array(z.string())]);

const CandidateMiniSchema = z.object({
	id: z.string().trim().min(1, "Candidate ID is required"),
	email: z.string().trim().email("Invalid email format").toLowerCase(),
});

const AnswerSchema = z.object({
	questionId: z.string().trim().min(1, "Question ID is required"),
	questionTopic: z.string().trim().min(1, "Question topic is required"),
	questionType: z.string().trim().min(1, "Question type is required"),
	answerValue: AnswerValueSchema,
});

export const SubmitAssessmentResultsSchema = z.object({
	candidate: CandidateMiniSchema,
	answers: z.array(AnswerSchema),
	tabSwitches: z.number().nonnegative().default(0),
	secondsUsed: z.number().nonnegative().default(0),
});
