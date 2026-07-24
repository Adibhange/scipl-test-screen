import { getCurrentAdmin, type AdminUser } from "@/repositories/admin.repository";

export type WriteActor = AdminUser & { isMaster: boolean };

export async function resolveWriteActor(): Promise<WriteActor | null> {
	const admin = await getCurrentAdmin();
	if (admin) {
		return {
			...admin,
			isMaster: admin.role === "director",
		};
	}

	return null;
}
