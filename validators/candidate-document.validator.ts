import { z } from "zod";

export const CandidateDocumentTypeSchema = z.enum(["resume", "application_form", "passport_photo"]);

export type CandidateDocumentTypeInput = z.infer<typeof CandidateDocumentTypeSchema>;
