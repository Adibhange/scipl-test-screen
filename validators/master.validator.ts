import { z } from "zod";

export const MasterLoginSchema = z.object({
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, "Master code must be exactly 6 digits"),
});

export type MasterLoginInput = z.infer<typeof MasterLoginSchema>;
