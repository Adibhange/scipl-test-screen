import { z } from "zod";

export const LogProctoringViolationSchema = z.object({
	candidateId: z.string().trim().min(1, "Candidate ID is required"),
	violationType: z.string().trim().default("tab_switch"),
});
