/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDatabaseAdapter } from "@/database/client";
import type { Candidate } from "@/types";

export type CandidateInput = {
	firstName: string;
	lastName: string;
	mobile: string;
	email: string;
	role: string;
	experience: string;
	testLocation?: string;
	hiringLocation?: string;
	hiringStatus?: Candidate["hiringStatus"];
	expectedSalary?: number;
	offerSalary?: number;
	hrNotes?: string;
	vacancyId?: string;
};

export type CandidateRecord = Omit<CandidateInput, "firstName" | "lastName"> & {
	id: string;
	firstName: string;
	lastName: string;
	vacancyTitle?: string;
	created_at: string;
};

export async function createCandidate(input: CandidateInput): Promise<CandidateRecord> {
	const metadata = getDatabaseAdapter().metadata;
	const [roleData, expData, testData] = await Promise.all([
		metadata.resolveRoleValue(input.role),
		metadata.resolveExperienceValue(input.experience),
		metadata.resolveTestLocationValue(input.testLocation || "home"),
	]);

	let hiringLocId: string | null = null;
	if (input.hiringLocation) {
		const hiringData = await metadata.resolveHiringLocationValue(input.hiringLocation);
		hiringLocId = hiringData?.id || null;
	}

	const roleId = roleData?.id;
	const expId = expData?.id;
	const testLocId = testData?.id;

	if (!roleId || !expId || !testLocId) {
		throw new Error(`Invalid pre-registration choices: role=${input.role}, exp=${input.experience}, testLoc=${input.testLocation}`);
	}

	const data = await getDatabaseAdapter().candidates.create({
		first_name: input.firstName,
		last_name: input.lastName,
		mobile: input.mobile,
		email: input.email,
		role: roleId,
		experience: expId,
		test_location: testLocId,
		hiring_location: hiringLocId,
		hiring_status: input.hiringStatus ?? "screening",
		expected_salary: input.expectedSalary ?? null,
		offer_salary: input.offerSalary ?? null,
		hr_notes: input.hrNotes ?? null,
		vacancy_id: input.vacancyId || null,
	});

	const hiringLocVal = (data as any).hiringLocObj?.value || undefined;

	return {
		id: String(data.id),
		firstName: String(data.first_name),
		lastName: String(data.last_name),
		mobile: String(data.mobile),
		email: String(data.email),
		role: input.role,
		experience: input.experience,
		testLocation: input.testLocation ?? "home",
		hiringLocation: hiringLocVal,
		hiringStatus: (data.hiring_status as any) ?? "screening",
		expectedSalary: data.expected_salary == null ? undefined : Number(data.expected_salary),
		offerSalary: data.offer_salary == null ? undefined : Number(data.offer_salary),
		hrNotes: (data.hr_notes as string | null) ?? undefined,
		vacancyId: data.vacancy_id || undefined,
		created_at: String(data.created_at),
	};
}

export async function getCandidateById(id: string): Promise<CandidateRecord | null> {
	const data = await getDatabaseAdapter().candidates.getById(id);
	if (!data) return null;

	const roleVal = (data as any).roleObj?.value || "";
	const expVal = (data as any).experienceObj?.value || "";
	const testLocVal = (data as any).testLocObj?.value || "home";
	const hiringLocVal = (data as any).hiringLocObj?.value || undefined;

	const vacancyVal = (data as any).vacancyObj;
	let vacancyTitleVal: string | undefined = undefined;
	if (vacancyVal) {
		const rLabel = vacancyVal.roleObj?.label || "";
		const eLabel = vacancyVal.experienceObj?.label || "";
		const hLabel = vacancyVal.hiringLocObj?.label || "";
		vacancyTitleVal = `${rLabel} (${eLabel}) - ${hLabel}`;
	}

	return {
		id: String(data.id),
		firstName: String(data.first_name),
		lastName: String(data.last_name),
		mobile: String(data.mobile),
		email: String(data.email),
		role: roleVal,
		experience: expVal,
		testLocation: testLocVal,
		hiringLocation: hiringLocVal,
		hiringStatus: (data.hiring_status as any) ?? "screening",
		expectedSalary: data.expected_salary == null ? undefined : Number(data.expected_salary),
		offerSalary: data.offer_salary == null ? undefined : Number(data.offer_salary),
		hrNotes: (data.hr_notes as string | null) ?? undefined,
		vacancyId: data.vacancy_id || undefined,
		vacancyTitle: vacancyTitleVal,
		created_at: String(data.created_at),
	};
}

export async function getCandidateByEmail(email: string): Promise<CandidateRecord | null> {
	const data = await getDatabaseAdapter().candidates.getByEmail(email);
	if (!data) return null;

	const roleVal = (data as any).roleObj?.value || "";
	const expVal = (data as any).experienceObj?.value || "";
	const testLocVal = (data as any).testLocObj?.value || "home";
	const hiringLocVal = (data as any).hiringLocObj?.value || undefined;

	return {
		id: String(data.id),
		firstName: String(data.first_name),
		lastName: String(data.last_name),
		mobile: String(data.mobile),
		email: String(data.email),
		role: roleVal,
		experience: expVal,
		testLocation: testLocVal,
		hiringLocation: hiringLocVal,
		hiringStatus: (data.hiring_status as any) ?? "screening",
		expectedSalary: data.expected_salary == null ? undefined : Number(data.expected_salary),
		offerSalary: data.offer_salary == null ? undefined : Number(data.offer_salary),
		hrNotes: (data.hr_notes as string | null) ?? undefined,
		vacancyId: data.vacancy_id || undefined,
		created_at: String(data.created_at),
	};
}

export async function checkReapplicationLockout(
	email: string,
	mobile: string,
	roleId: string,
	candidateId?: string,
): Promise<boolean> {
	return getDatabaseAdapter().candidates.checkReapplicationLockout(
		email,
		mobile,
		roleId,
		candidateId,
	);
}
