import { getCurrentAdmin, type AdminUser } from "@/repositories/admin.repository";
import { getCurrentMaster } from "@/repositories/master.repository";

/**
 * Feature 5 (Master Permissions): Master has every permission Admin has,
 * plus full editing rights, with no restrictions. Rather than duplicating
 * every admin write endpoint's business logic, Master is represented here as
 * a synthetic "hr" actor — the role that already has unrestricted edit
 * access in this codebase — so existing admin write APIs work unmodified in
 * their business logic and only need this resolver swapped in for their
 * auth check.
 *
 * `isMaster` lets callers distinguish the two for audit logging without
 * changing authorization behavior.
 */
export type WriteActor = AdminUser & { isMaster: boolean };

export const MASTER_ACTOR: WriteActor = {
	userId: "master",
	email: "master@internal",
	name: "Master",
	role: "hr",
	isMaster: true,
};

export async function resolveWriteActor(): Promise<WriteActor | null> {
	const admin = await getCurrentAdmin();
	if (admin) return { ...admin, isMaster: false };

	const master = await getCurrentMaster();
	if (master) return MASTER_ACTOR;

	return null;
}
