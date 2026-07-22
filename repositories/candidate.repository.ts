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
	experiences?: any[];
	references?: any[];
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

	// Save experiences if provided
	if (input.experiences && Array.isArray(input.experiences)) {
		for (const exp of input.experiences) {
			await getDatabaseAdapter().candidateExperiences.create({
				candidate_id: data.id,
				companyName: exp.companyName,
				designation: exp.designation,
				joiningDate: new Date(exp.joiningDate).toISOString(),
				leavingDate: exp.leavingDate ? new Date(exp.leavingDate).toISOString() : null,
				salary: exp.salary ?? null,
				noticePeriod: exp.noticePeriod ?? 0,
				isCurrent: exp.isCurrent ?? false,
			});
		}
	}

	// Save references if provided
	if (input.references && Array.isArray(input.references)) {
		for (const ref of input.references) {
			await getDatabaseAdapter().candidateReferences.create({
				candidate_id: data.id,
				referenceType: ref.referenceType,
				referenceName: ref.referenceName,
				referenceMobile: ref.referenceMobile,
				employeeCode: ref.employeeCode || null,
				notes: ref.notes ?? null,
				verifiedBy: ref.verifiedBy ?? null,
			});
		}
	}

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

	const experiences = await getDatabaseAdapter().candidateExperiences.getByCandidateId(data.id);
	const references = await getDatabaseAdapter().candidateReferences.getByCandidateId(data.id);

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
		experiences,
		references,
	};
}

export async function getCandidateByEmail(email: string): Promise<CandidateRecord | null> {
	const data = await getDatabaseAdapter().candidates.getByEmail(email);
	if (!data) return null;

	const roleVal = (data as any).roleObj?.value || "";
	const expVal = (data as any).experienceObj?.value || "";
	const testLocVal = (data as any).testLocObj?.value || "home";
	const hiringLocVal = (data as any).hiringLocObj?.value || undefined;

	const experiences = await getDatabaseAdapter().candidateExperiences.getByCandidateId(data.id);
	const references = await getDatabaseAdapter().candidateReferences.getByCandidateId(data.id);

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
		experiences,
		references,
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

export async function updateCandidate(id: string, input: Partial<CandidateInput>): Promise<void> {
	// First update core candidate details in candidates table
	const candidateUpdates: any = {};
	if (input.firstName !== undefined) candidateUpdates.first_name = input.firstName;
	if (input.lastName !== undefined) candidateUpdates.last_name = input.lastName;
	if (input.mobile !== undefined) candidateUpdates.mobile = input.mobile;
	if (input.email !== undefined) candidateUpdates.email = input.email;
	if (input.hiringStatus !== undefined) candidateUpdates.hiring_status = input.hiringStatus;
	if (input.expectedSalary !== undefined) candidateUpdates.expected_salary = input.expectedSalary ?? null;
	if (input.offerSalary !== undefined) candidateUpdates.offer_salary = input.offerSalary ?? null;
	if (input.hrNotes !== undefined) candidateUpdates.hr_notes = input.hrNotes ?? null;
	if (input.role !== undefined) candidateUpdates.role = input.role;
	if (input.experience !== undefined) candidateUpdates.experience = input.experience;
	if (input.testLocation !== undefined) candidateUpdates.test_location = input.testLocation;
	if (input.hiringLocation !== undefined) candidateUpdates.hiring_location = input.hiringLocation;

	if (Object.keys(candidateUpdates).length > 0) {
		await getDatabaseAdapter().candidates.update(id, candidateUpdates);
	}

	// Update experiences if provided
	if (input.experiences !== undefined && Array.isArray(input.experiences)) {
		const existing = await getDatabaseAdapter().candidateExperiences.getByCandidateId(id);
		const incomingIds = input.experiences.map((e: any) => e.id).filter(Boolean);

		// Delete removed experiences
		for (const ext of existing) {
			if (ext.id && !incomingIds.includes(ext.id)) {
				await getDatabaseAdapter().candidateExperiences.delete(ext.id);
			}
		}

		// Insert or Update incoming experiences
		for (const exp of input.experiences) {
			const expRecord = {
				companyName: exp.companyName,
				designation: exp.designation,
				joiningDate: new Date(exp.joiningDate).toISOString(),
				leavingDate: exp.leavingDate ? new Date(exp.leavingDate).toISOString() : null,
				salary: exp.salary ?? null,
				noticePeriod: exp.noticePeriod ?? 0,
				isCurrent: exp.isCurrent ?? false,
			};

			if (exp.id) {
				await getDatabaseAdapter().candidateExperiences.update(exp.id, expRecord);
			} else {
				await getDatabaseAdapter().candidateExperiences.create({
					candidate_id: id,
					...expRecord,
				});
			}
		}
	}

	// Update references if provided
	if (input.references !== undefined && Array.isArray(input.references)) {
		const existing = await getDatabaseAdapter().candidateReferences.getByCandidateId(id);
		const incomingIds = input.references.map((r: any) => r.id).filter(Boolean);

		// Delete removed references
		for (const ext of existing) {
			if (ext.id && !incomingIds.includes(ext.id)) {
				await getDatabaseAdapter().candidateReferences.delete(ext.id);
			}
		}

		// Insert or Update incoming references
		for (const ref of input.references) {
			const refRecord = {
				referenceType: ref.referenceType,
				referenceName: ref.referenceName,
				referenceMobile: ref.referenceMobile,
				employeeCode: ref.employeeCode || null,
				notes: ref.notes ?? null,
				verifiedBy: ref.verifiedBy ?? null,
			};

			if (ref.id) {
				await getDatabaseAdapter().candidateReferences.update(ref.id, refRecord);
			} else {
				await getDatabaseAdapter().candidateReferences.create({
					candidate_id: id,
					...refRecord,
				});
			}
		}
	}
}
