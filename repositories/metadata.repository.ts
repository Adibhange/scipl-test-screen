/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDatabaseAdapter } from "@/database/client";

export async function getMetadata(activeOnly = true) {
	const metadata = getDatabaseAdapter().metadata;
	const [roles, experience, testLocations, hiringLocations] = await Promise.all([
		metadata.getMasterRoles(activeOnly),
		metadata.getMasterExperiences(activeOnly),
		metadata.getMasterTestLocations(activeOnly),
		metadata.getMasterHiringLocations(activeOnly),
	]);

	return {
		roles: roles.map(r => ({ value: r.value, label: r.label })),
		experience: experience.map(e => ({
			value: e.value,
			label: e.label,
			filled: e.filled_dots ?? e.filled ?? 1,
		})),
		testLocations: testLocations.map(t => ({ value: t.value, label: t.label })),
		hiringLocations: hiringLocations.map(h => ({ value: h.value, label: h.label })),
	};
}

export async function getVacancies(activeOnly = true) {
	const list = await getDatabaseAdapter().metadata.getVacancies(activeOnly);
	return list.map(v => ({
		id: v.id,
		role: (v as any).roleObj?.value || "",
		experience: (v as any).experienceObj?.value || "",
		hiring_location: (v as any).hiringLocObj?.value || "",
		test_locations: v.test_locations,
		openings: v.openings,
		is_active: v.is_active,
		created_at: v.created_at,
	}));
}

export async function createVacancy(data: any) {
	return getDatabaseAdapter().metadata.createVacancy(data);
}

export async function updateVacancy(id: string, data: any) {
	return getDatabaseAdapter().metadata.updateVacancy(id, data);
}

export async function deleteVacancy(id: string) {
	return getDatabaseAdapter().metadata.deleteVacancy(id);
}

export async function createMasterItem(type: string, data: any) {
	return getDatabaseAdapter().metadata.createMasterItem(type, data);
}

export async function updateMasterItem(type: string, id: string, data: any) {
	return getDatabaseAdapter().metadata.updateMasterItem(type, id, data);
}

export async function deleteMasterItem(type: string, id: string) {
	return getDatabaseAdapter().metadata.deleteMasterItem(type, id);
}

export async function resolveRoleValue(value: string) {
	return getDatabaseAdapter().metadata.resolveRoleValue(value);
}

export async function resolveExperienceValue(value: string) {
	return getDatabaseAdapter().metadata.resolveExperienceValue(value);
}

export async function resolveHiringLocationValue(value: string) {
	return getDatabaseAdapter().metadata.resolveHiringLocationValue(value);
}

export async function resolveTestLocationValue(value: string) {
	return getDatabaseAdapter().metadata.resolveTestLocationValue(value);
}
