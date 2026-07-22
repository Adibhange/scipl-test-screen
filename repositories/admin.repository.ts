/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/database/adapters/supabase";
import { getDatabaseAdapter } from "@/database/client";

export type AdminRole = "hr" | "interviewer" | "director";
export type AdminUser = {
	userId: string;
	email: string;
	name: string;
	role: AdminRole;
};

import { cache } from "react";

export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
	const authClient = await createSupabaseServerClient();
	const { data: { user } } = await authClient.auth.getUser();
	if (!user?.email) return null;

	const data = await getDatabaseAdapter().admins.getById(user.id);

	return data ? {
		userId: data.user_id,
		email: data.email,
		name: data.name,
		role: data.role as AdminRole,
	} : null;
});

export function canReviewRound(role: AdminRole, round: "face_to_face" | "assessment" | "director") {
	return role === "hr" || (role === "interviewer" && round !== "director") || (role === "director" && round === "director");
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
