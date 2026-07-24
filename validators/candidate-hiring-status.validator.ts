import { z } from "zod";

export const UpdateHiringStatusSchema = z.object({
	hiringStatus: z.enum(["hired", "rejected"]),
});

export type UpdateHiringStatusInput = z.infer<typeof UpdateHiringStatusSchema>;
