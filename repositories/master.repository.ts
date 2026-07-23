import { cache } from "react";
import { cookies } from "next/headers";
import { env } from "@/env";
import { MASTER_SESSION_COOKIE, verifyMasterSessionToken } from "@/lib/master-session";

export type MasterUser = {
	role: "master";
};

/**
 * Resolves the current Master session from the HTTP-only cookie.
 * Completely independent from Supabase-backed Admin authentication —
 * do not conflate this with `getCurrentAdmin`.
 */
export const getCurrentMaster = cache(async (): Promise<MasterUser | null> => {
	if (!env.MASTER_SESSION_SECRET) return null;

	const cookieStore = await cookies();
	const token = cookieStore.get(MASTER_SESSION_COOKIE)?.value;
	const isValid = await verifyMasterSessionToken(token, env.MASTER_SESSION_SECRET);

	return isValid ? { role: "master" } : null;
});
