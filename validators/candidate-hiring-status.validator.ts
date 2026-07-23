import { z } from "zod";

export const UpdateHiringStatusSchema = z.object({
	hiringStatus: z.enum(["screening", "interviewing", "offered", "hired", "rejected", "on_hold"]),
});

export type UpdateHiringStatusInput = z.infer<typeof UpdateHiringStatusSchema>;
