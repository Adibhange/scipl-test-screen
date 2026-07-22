import { z } from "zod";

export const GradeCandidateAnswerSchema = z.object({
	resultId: z.string().trim().min(1, "Result ID is required"),
	questionId: z.string().trim().min(1, "Question ID is required"),
	grade: z.enum(["correct", "partial", "incorrect"]),
});

export const PreRegisterCandidateSchema = z.object({
	firstName: z.string().trim().min(1, "First name is required"),
	lastName: z.string().trim().min(1, "Last name is required"),
	mobile: z.string().trim().min(1, "Mobile is required"),
	email: z.string().trim().email("Invalid email format").toLowerCase(),
	role: z.string().trim().min(1, "Role is required"),
	experience: z.string().trim().min(1, "Experience is required"),
	testLocation: z.string().trim().optional(),
	hiringLocation: z.string().trim().optional(),
	vacancyId: z.string().trim().optional(),
	experiences: z.array(z.object({
		companyName: z.string().trim().min(1, "Company name is required"),
		designation: z.string().trim().min(1, "Designation is required"),
		joiningDate: z.string().trim().min(1, "Joining date is required"),
		leavingDate: z.string().trim().nullable().optional(),
		salary: z.number().nonnegative().optional(),
		noticePeriod: z.number().int().nonnegative().default(0),
		isCurrent: z.boolean().default(false),
	})).optional(),
	references: z.array(z.object({
		referenceType: z.enum(["INTERNAL", "EXTERNAL"]),
		referenceName: z.string().trim().min(1, "Reference name is required"),
		referenceMobile: z.string().trim().min(1, "Reference mobile is required"),
		employeeCode: z.string().trim().optional(),
		verifiedBy: z.string().trim().optional(),
		notes: z.string().trim().optional(),
	})).optional(),
});

export const CreateAdminUserSchema = z.object({
	email: z.string().trim().email("Invalid email format").toLowerCase(),
	name: z.string().trim().min(1, "Name is required"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	role: z.enum(["hr", "interviewer", "director"]),
});

export const UpdateAdminProfileSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	email: z.string().trim().email("Invalid email format").toLowerCase(),
	password: z.string().min(8, "Password must be at least 8 characters").or(z.literal("")).optional(),
});

export const UpdateAdminUserSchema = z.object({
	userId: z.string().trim().min(1, "User ID is required"),
	name: z.string().trim().min(1, "Name is required"),
	email: z.string().trim().email("Invalid email format").toLowerCase(),
	password: z.string().min(8, "Password must be at least 8 characters").or(z.literal("")).optional(),
	role: z.enum(["hr", "interviewer", "director"]).optional(),
});

export const CreateConfigSchema = z.object({
	type: z.enum(["vacancy", "role", "experience", "hiring_location", "test_location"]),
	value: z.string().trim().min(1, "Value is required").optional(),
	label: z.string().trim().min(1, "Label is required").optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	role: z.string().trim().optional(),
	experience: z.string().trim().optional(),
	hiring_location: z.string().trim().optional(),
	test_locations: z.array(z.string()).optional(),
	openings: z.number().int().positive().optional(),
});

export const UpdateConfigSchema = z.object({
	id: z.string().trim().min(1, "ID is required"),
	type: z.enum(["vacancy", "role", "experience", "hiring_location", "test_location"]).optional(),
	isVacancy: z.boolean().optional(),
	is_active: z.boolean().optional(),
	openings: z.number().int().nonnegative().optional(),
	label: z.string().trim().optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

export const DeleteConfigSchema = z.object({
	id: z.string().trim().min(1, "ID is required"),
	isVacancy: z.enum(["true", "false"]).transform((val) => val === "true"),
	type: z.string().trim().optional(),
});

export const AssignInterviewerSchema = z.object({
	resultId: z.string().trim().min(1, "Result ID is required"),
	role: z.string().trim().optional(),
	experience: z.string().trim().optional(),
	testLocation: z.string().trim().optional(),
	hiringLocation: z.string().trim().optional(),
	hiringStatus: z.string().trim().optional(),
	expectedSalary: z.number().nullable().optional(),
	offerSalary: z.number().nullable().optional(),
	hrNotes: z.string().trim().optional(),
	interviewerId: z.string().trim().optional(),
	interviewerName: z.string().trim().optional(),
	interviewerEmail: z.string().trim().optional(),
	experiences: z.array(z.object({
		id: z.string().trim().optional(),
		companyName: z.string().trim().min(1, "Company name is required"),
		designation: z.string().trim().min(1, "Designation is required"),
		joiningDate: z.string().trim().min(1, "Joining date is required"),
		leavingDate: z.string().trim().nullable().optional(),
		salary: z.number().nonnegative().optional(),
		noticePeriod: z.number().int().nonnegative().default(0),
		isCurrent: z.boolean().default(false),
	})).optional(),
	references: z.array(z.object({
		id: z.string().trim().optional(),
		referenceType: z.enum(["INTERNAL", "EXTERNAL"]),
		referenceName: z.string().trim().min(1, "Reference name is required"),
		referenceMobile: z.string().trim().min(1, "Reference mobile is required"),
		employeeCode: z.string().trim().optional(),
		verifiedBy: z.string().trim().optional(),
		notes: z.string().trim().optional(),
	})).optional(),
});

export const SubmitRoundFeedbackSchema = z.object({
	resultId: z.string().trim().min(1, "Result ID is required"),
	round: z.enum(["face_to_face", "assessment", "director"]),
	status: z.enum(["pending", "pass", "fail"]),
	remarks: z.string().trim().optional(),
});
