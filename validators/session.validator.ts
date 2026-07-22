import { z } from "zod";

export const GetExamSessionSchema = z.object({
	candidateId: z.string().trim().min(1, "Candidate ID is required"),
});

export const InitiateExamSessionSchema = z.object({
	candidateId: z.string().trim().min(1, "Candidate ID is required"),
	candidateEmail: z.string().trim().email("Invalid candidate email").toLowerCase(),
	role: z.string().trim().default(""),
	experience: z.string().trim().default(""),
	sessionToken: z.string().trim().nullable().optional(),
	force: z.boolean().default(false),
});

export const ProgressExamSessionSchema = z.object({
	candidateId: z.string().trim().min(1, "Candidate ID is required"),
	sessionToken: z.string().trim().optional(),
	action: z.enum(["start", "submit"]).optional(),
	secondsUsed: z.number().nonnegative().optional(),
});

export const DeleteExamSessionSchema = z.object({
	candidateId: z.string().trim().min(1, "Candidate ID is required"),
});
