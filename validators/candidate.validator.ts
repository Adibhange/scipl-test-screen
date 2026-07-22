import { z } from "zod";

export const CheckCandidateStatusSchema = z.object({
	email: z.string().trim().email("Invalid email format").toLowerCase(),
	role: z.string().trim().optional(),
	experience: z.string().trim().optional(),
});

export const RegisterCandidateSchema = z.object({
	firstName: z.string().trim().min(1, "First name is required"),
	lastName: z.string().trim().min(1, "Last name is required"),
	mobile: z.string().trim().min(1, "Mobile number is required"),
	email: z.string().trim().email("Invalid email format").toLowerCase(),
	vacancyId: z.string().trim().min(1, "Vacancy is required"),
	testLocation: z.string().trim().min(1, "Test location is required"),
});
