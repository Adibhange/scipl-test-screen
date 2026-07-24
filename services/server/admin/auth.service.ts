import { getDatabaseAdapter } from "@/database/client";
import { verifyPassword, verifyPin } from "./credential.service";
import { createSession } from "./session.service";
import { logSecurityEvent } from "@/lib/audit-logger";

export async function authenticateAdmin(
	email: string,
	password: string,
	ipAddress?: string | null,
	userAgent?: string | null
): Promise<any | null> {
	const ip = ipAddress || "127.0.0.1";
	const admin = await getDatabaseAdapter().admins.getByEmail(email);

	if (!admin || admin.active === false || !admin.password_hash) {
		logSecurityEvent({
			action: "admin_login",
			actor: { email, ip },
			status: "failure",
			details: { reason: !admin ? "user_not_found" : admin.active === false ? "user_inactive" : "no_password" },
		});
		return null;
	}

	const isValid = await verifyPassword(password, admin.password_hash);
	if (!isValid) {
		logSecurityEvent({
			action: "admin_login",
			actor: { id: admin.user_id, email: admin.email, role: admin.role, ip },
			status: "failure",
			details: { reason: "invalid_password" },
		});
		return null;
	}

	const token = await createSession(admin.user_id, ipAddress, userAgent);

	logSecurityEvent({
		action: "admin_login",
		actor: { id: admin.user_id, email: admin.email, role: admin.role, ip },
		status: "success",
	});

	return {
		userId: admin.user_id,
		email: admin.email,
		name: admin.name,
		role: admin.role,
		token,
	};
}

export async function authenticateDirector(
	pin: string,
	ipAddress?: string | null,
	userAgent?: string | null
): Promise<any | null> {
	const ip = ipAddress || "127.0.0.1";
	const admins = await getDatabaseAdapter().admins.getAll();
	const directors = admins.filter(
		(a: any) => a.role === "director" && a.active !== false && a.master_code_hash
	);

	let matchedDirector: any = null;
	for (const director of directors) {
		const matches = await verifyPin(pin, director.master_code_hash);
		if (matches) {
			matchedDirector = director;
			break;
		}
	}

	if (!matchedDirector) {
		logSecurityEvent({
			action: "director_login",
			actor: { ip },
			status: "failure",
			details: { reason: "invalid_pin" },
		});
		return null;
	}

	const token = await createSession(matchedDirector.user_id, ipAddress, userAgent);

	logSecurityEvent({
		action: "director_login",
		actor: { id: matchedDirector.user_id, email: matchedDirector.email, role: matchedDirector.role, ip },
		status: "success",
	});

	return {
		userId: matchedDirector.user_id,
		email: matchedDirector.email,
		name: matchedDirector.name,
		role: matchedDirector.role,
		mustChangeMasterPin: matchedDirector.must_change_master_pin,
		token,
	};
}

export async function verifyDirectorPinUniqueness(newPin: string): Promise<boolean> {
	const admins = await getDatabaseAdapter().admins.getAll();
	const directors = admins.filter(
		(a: any) => a.role === "director" && a.active !== false && a.master_code_hash
	);

	for (const director of directors) {
		const matches = await verifyPin(newPin, director.master_code_hash);
		if (matches) {
			return false;
		}
	}

	return true;
}
