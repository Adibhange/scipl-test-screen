import { getDatabaseAdapter } from "@/database/client";
import { cookies } from "next/headers";
import { validateSession, SESSION_COOKIE_NAME } from "@/services/server/admin/session.service";
import { canReviewRound as permCanReviewRound } from "@/lib/permissions";

export type AdminRole = "hr" | "interviewer" | "director";
export type AdminUser = {
	userId: string;
	email: string;
	name: string;
	role: AdminRole;
	mustChangeMasterPin?: boolean | null;
	masterPinChangedAt?: string | null;
	active?: boolean | null;
};

import { cache } from "react";

export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
	try {
		const cookieStore = await cookies();
		const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
		if (!token) return null;

		const sessionUser = await validateSession(token);
		if (!sessionUser) return null;

		return {
			userId: sessionUser.userId,
			email: sessionUser.email,
			name: sessionUser.name,
			role: sessionUser.role as AdminRole,
			mustChangeMasterPin: sessionUser.mustChangeMasterPin,
			masterPinChangedAt: sessionUser.masterPinChangedAt,
			active: sessionUser.active,
		};
	} catch {
		return null;
	}
});

export function canReviewRound(role: AdminRole, round: "face_to_face" | "assessment" | "director") {
	return permCanReviewRound(role, round);
}

export async function getAdminUsers() {
	return getDatabaseAdapter().admins.getAll();
}

export async function createAdminUser(data: any) {
	return getDatabaseAdapter().admins.upsert(data);
}

export async function updateAdminUser(userId: string, data: any) {
	return getDatabaseAdapter().admins.update(userId, data);
}

export async function deleteAdminUser(userId: string) {
	await getDatabaseAdapter().admins.delete(userId);
}
