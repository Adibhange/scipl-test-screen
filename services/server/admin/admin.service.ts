/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	getVacancies,
	createVacancy,
	updateVacancy,
	deleteVacancy,
	createMasterItem,
	updateMasterItem,
	deleteMasterItem,
	resolveRoleValue,
	resolveExperienceValue,
	resolveHiringLocationValue,
} from "@/repositories/metadata.repository";
import { getAdminUsers } from "@/repositories/admin.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ValidationError } from "@/lib/errors";

/**
 * Service to handle administrative operations, team user rosters, vacancies, and configs.
 */
export async function getAdminConfigurations() {
	// 1. Fetch metadata configurations

	const configItems: any[] = [];
	const roles = await getDatabaseAdapter().metadata.getMasterRoles(false);
	const experiences = await getDatabaseAdapter().metadata.getMasterExperiences(false);
	const hiring = await getDatabaseAdapter().metadata.getMasterHiringLocations(false);
	const test = await getDatabaseAdapter().metadata.getMasterTestLocations(false);

	configItems.push(...(roles || []).map(r => ({ id: r.id, type: "role", value: r.value, label: r.label, is_active: r.is_active, metadata: {} })));
	configItems.push(...(experiences || []).map(e => ({ id: e.id, type: "experience", value: e.value, label: e.label, is_active: e.is_active, metadata: { filled: e.filled_dots } })));
	configItems.push(...(hiring || []).map(h => ({ id: h.id, type: "hiring_location", value: h.value, label: h.label, is_active: h.is_active, metadata: {} })));
	configItems.push(...(test || []).map(t => ({ id: t.id, type: "test_location", value: t.value, label: t.label, is_active: t.is_active, metadata: {} })));

	// 2. Fetch active vacancies using repository
	const vacancies = await getVacancies(false);

	// 3. Fetch candidate applications to count active applicants per role+experience combination
	const candidates = await getDatabaseAdapter().candidates.getRoleExperienceList();

	const applicantCounts: Record<string, number> = {};
	if (candidates && candidates.length > 0) {
		candidates.forEach((candidate) => {
			const rVal = (candidate as any).roleObj?.value || "";
			const eVal = (candidate as any).experienceObj?.value || "";
			const key = `${rVal}_${eVal}`.toLowerCase();
			applicantCounts[key] = (applicantCounts[key] || 0) + 1;
		});
	}

	// Map applicant counts into the vacancies array
	const mappedVacancies = vacancies.map((vacancy) => {
		const key = `${vacancy.role}_${vacancy.experience}`.toLowerCase();
		return {
			...vacancy,
			applicantCount: applicantCounts[key] ?? 0,
		};
	});

	return {
		configs: configItems,
		vacancies: mappedVacancies,
	};
}

export async function createAdminConfiguration(body: any) {
	if (body.type === "vacancy") {
		if (!body.role || !body.experience || !body.hiring_location || !body.test_locations || !Array.isArray(body.test_locations)) {
			throw new ValidationError("role, experience, hiring_location and test_locations (array) are required for vacancies");
		}

		// Resolve text choice inputs to master table UUID keys
		const roleData = await resolveRoleValue(body.role.trim());
		const expData = await resolveExperienceValue(body.experience.trim());
		const hiringData = await resolveHiringLocationValue(body.hiring_location.trim());

		if (!roleData || !expData || !hiringData) {
			throw new ValidationError("Invalid role, experience, or hiring location configuration choices");
		}

		const data = await createVacancy({
			role: roleData.id,
			experience: expData.id,
			hiring_location: hiringData.id,
			test_locations: body.test_locations,
			openings: Number(body.openings || 1),
			is_active: body.is_active !== false,
		});

		return {
			id: data.id,
			role: body.role.trim(),
			experience: body.experience.trim(),
			hiring_location: body.hiring_location.trim(),
			test_locations: data.test_locations,
			openings: data.openings,
			is_active: data.is_active,
			created_at: data.created_at,
		};
	} else {
		if (!body.type || !body.value || !body.label) {
			throw new ValidationError("type, value and label are required");
		}

		const type = body.type;
		const insertObj: Record<string, unknown> = {
			value: body.value.trim(),
			label: body.label.trim(),
			is_active: body.is_active !== false,
		};

		if (type === "experience") {
			insertObj.filled_dots = Number(body.metadata?.filled || 1);
		}

		const data = await createMasterItem(type, insertObj);

		return {
			id: data.id,
			type,
			value: data.value,
			label: data.label,
			is_active: data.is_active,
			metadata: type === "experience" ? { filled: data.filled_dots } : {},
		};
	}
}

export async function updateAdminConfiguration(body: any) {
	if (!body.id) {
		throw new ValidationError("id is required");
	}

	if (body.isVacancy) {
		const updates: Record<string, unknown> = {};
		if (body.is_active !== undefined) updates.is_active = body.is_active;
		if (body.openings !== undefined) updates.openings = Number(body.openings);
		if (body.test_locations !== undefined) updates.test_locations = body.test_locations;

		if (body.role !== undefined) {
			const rd = await resolveRoleValue(body.role.trim());
			if (!rd) throw new ValidationError("Invalid role configuration choices");
			updates.role = rd.id;
		}
		if (body.experience !== undefined) {
			const ed = await resolveExperienceValue(body.experience.trim());
			if (!ed) throw new ValidationError("Invalid experience configuration choices");
			updates.experience = ed.id;
		}
		if (body.hiring_location !== undefined) {
			const hd = await resolveHiringLocationValue(body.hiring_location.trim());
			if (!hd) throw new ValidationError("Invalid hiring location configuration choices");
			updates.hiring_location = hd.id;
		}

		const data = await updateVacancy(body.id, updates);

		return {
			id: data.id,
			role: body.role || "",
			experience: body.experience || "",
			hiring_location: body.hiring_location || "",
			test_locations: data.test_locations,
			openings: data.openings,
			is_active: data.is_active,
			created_at: data.created_at,
		};
	} else {
		if (!body.type) {
			throw new ValidationError("type is required to identify target master table");
		}

		const type = body.type;
		const updates: Record<string, unknown> = {};
		
		if (body.label !== undefined) updates.label = body.label.trim();
		if (body.is_active !== undefined) updates.is_active = body.is_active;

		if (type === "experience" && body.metadata?.filled !== undefined) {
			updates.filled_dots = Number(body.metadata.filled);
		}

		const data = await updateMasterItem(type, body.id, updates);

		return {
			id: data.id,
			type,
			value: data.value,
			label: data.label,
			is_active: data.is_active,
			metadata: type === "experience" ? { filled: data.filled_dots } : {},
		};
	}
}

export async function deleteAdminConfiguration(id: string, isVacancy: boolean, type?: string | null) {
	if (isVacancy) {
		await deleteVacancy(id);
	} else {
		if (!type) {
			throw new ValidationError("type parameter is required to identify target master table");
		}
		await deleteMasterItem(type, id);
	}
}

export async function getAdminRoster() {
	return getAdminUsers();
}

export async function createAdminAccount(body: {
	email?: string;
	name?: string;
	password?: string;
	role?: string;
}) {
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const password = typeof body.password === "string" ? body.password : "";
	const role = body.role;
	
	if (
		!email ||
		!name ||
		password.length < 8 ||
		!["hr", "interviewer", "director"].includes(role as any)
	) {
		throw new ValidationError("Name, valid email, role and an 8 character password are required.");
	}

	const adminsAdapter = getDatabaseAdapter().admins;
	let userId: string | undefined;

	try {
		const created = await adminsAdapter.authCreateUser(email, password);
		userId = created.user?.id;
	} catch (createError: any) {
		if (!createError.message.toLowerCase().includes("already registered")) {
			throw createError;
		}
	}

	if (!userId) {
		const users = await adminsAdapter.authListUsers();
		userId = users.find(
			(user: any) => user.email?.toLowerCase() === email,
		)?.id;
	}

	if (!userId) {
		throw new ValidationError("Could not find or create the Auth user.");
	}

	return adminsAdapter.upsert({ user_id: userId, email, name, role });
}

export async function updateAdminProfile(userId: string, body: {
	name?: string;
	email?: string;
	password?: string;
	role?: string;
	adminEmail?: string;
}) {
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";

	if (!name || !email) {
		throw new ValidationError("Name and email are required.");
	}

	if (password && password.length < 8) {
		throw new ValidationError("Password must be at least 8 characters.");
	}

	const adminsAdapter = getDatabaseAdapter().admins;
	const updates: Record<string, string> = { name, email };
	
	await adminsAdapter.update(userId, updates);

	if (email !== body.adminEmail) {
		await adminsAdapter.authUpdateUser(userId, { email });
	}

	if (password) {
		await adminsAdapter.authUpdateUser(userId, { password });
	}
}

export async function updateAdminAccount(userId: string, body: {
	name?: string;
	email?: string;
	password?: string;
	role?: string;
}) {
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";
	const role = body.role;

	if (!userId) {
		throw new ValidationError("userId is required.");
	}
	if (!name || !email) {
		throw new ValidationError("Name and email are required.");
	}
	if (role && !["hr", "interviewer", "director"].includes(role)) {
		throw new ValidationError("Invalid role value.");
	}
	if (password && password.length < 8) {
		throw new ValidationError("Password must be at least 8 characters.");
	}

	const adminsAdapter = getDatabaseAdapter().admins;
	const updates: Record<string, string> = {
		name: name.trim(),
		email: email.trim().toLowerCase(),
		...(role ? { role } : {}),
	};

	await adminsAdapter.update(userId, updates);
	await adminsAdapter.authUpdateUser(userId, { email: email.trim().toLowerCase() });

	if (password) {
		await adminsAdapter.authUpdateUser(userId, { password });
	}
}
