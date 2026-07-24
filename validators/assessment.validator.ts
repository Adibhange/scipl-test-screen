import { z } from "zod";

export const GetQuestionsSchema = z.object({
	role: z.string().trim().min(1, "Role is required"),
	experience: z.string().trim().min(1, "Experience track is required"),
	all: z.enum(["0", "1"]).optional().transform((val) => val === "1"),
	sessionId: z.string().trim().optional(),
});
