import { z } from "zod";

export const GenerateShareLinkSchema = z.object({
	validityHours: z.union([z.literal(1), z.literal(12), z.literal(24)]).default(12),
});

export type GenerateShareLinkInput = z.infer<typeof GenerateShareLinkSchema>;

export const RevokeShareLinkSchema = z.object({
	reason: z.string().trim().max(500).optional(),
});

export type RevokeShareLinkInput = z.infer<typeof RevokeShareLinkSchema>;
