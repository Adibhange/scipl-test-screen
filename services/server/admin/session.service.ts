import { getDatabaseAdapter } from "@/database/client";
import { randomBytes, createHash } from "crypto";

export const SESSION_COOKIE_NAME = "scipl_admin_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
	adminUserId: string,
	ipAddress?: string | null,
	userAgent?: string | null
): Promise<string> {
	const rawToken = randomBytes(32).toString("hex");
	const sessionTokenHash = hashToken(rawToken);
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

	await getDatabaseAdapter().sessions.create({
		sessionTokenHash,
		adminUserId,
		expiresAt,
		ipAddress,
		userAgent,
	});

	return rawToken;
}

export async function validateSession(rawToken: string, ipAddress?: string | null, userAgent?: string | null): Promise<any | null> {
	if (!rawToken) return null;
	const sessionTokenHash = hashToken(rawToken);

	const session = await getDatabaseAdapter().sessions.getByHash(sessionTokenHash);
	if (!session) return null;

	if (session.revoked_at || new Date(session.expires_at) < new Date()) {
		return null;
	}

	// Update last used
	await getDatabaseAdapter().sessions.updateLastUsed(session.id, {
		ipAddress,
		userAgent,
	});

	// Get admin
	const admin = await getDatabaseAdapter().admins.getById(session.admin_user_id);
	if (!admin || admin.active === false) {
		return null;
	}

	return {
		userId: admin.user_id,
		email: admin.email,
		name: admin.name,
		role: admin.role,
		mustChangeMasterPin: admin.must_change_master_pin,
		masterPinChangedAt: admin.master_pin_changed_at,
		active: admin.active,
		expiresAt: session.expires_at,
	};
}

export async function destroySession(rawToken: string): Promise<void> {
	if (!rawToken) return;
	const sessionTokenHash = hashToken(rawToken);

	const session = await getDatabaseAdapter().sessions.getByHash(sessionTokenHash);
	if (session) {
		await getDatabaseAdapter().sessions.revoke(session.id);
	}
}

export async function revokeAllSessionsForUser(adminUserId: string): Promise<void> {
	await getDatabaseAdapter().sessions.revokeAllForUser(adminUserId);
}

export async function cleanupSessions(): Promise<number> {
	// Cutoff for revoked or expired: 30 days ago
	const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	return getDatabaseAdapter().sessions.deleteExpiredAndRevoked(cutoff);
}
