/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "./logger";

export interface AuditLogPayload {
	action: string;
	actor: {
		id?: string;
		email?: string;
		role?: string;
		ip?: string;
	};
	targetId?: string;
	details?: Record<string, any>;
	status: "success" | "failure";
	timestamp: string;
}

export function logSecurityEvent(payload: Omit<AuditLogPayload, "timestamp">) {
	// Sanitize details to prevent logging passwords, keys, secrets, or credentials
	const sanitizedDetails = payload.details ? { ...payload.details } : {};
	const sensitiveFields = ["password", "token", "secret", "key", "credential", "auth"];

	Object.keys(sanitizedDetails).forEach(key => {
		const lowerKey = key.toLowerCase();
		if (sensitiveFields.some(field => lowerKey.includes(field))) {
			sanitizedDetails[key] = "[REDACTED]";
		}
	});

	const event: AuditLogPayload = {
		...payload,
		details: sanitizedDetails,
		timestamp: new Date().toISOString(),
	};

	logger.info(`[AUDIT_LOG] ${event.action}`, { event });
}

export function getClientIpFromHeaders(headers: Headers): string {
	const xForwardedFor = headers.get("x-forwarded-for");
	if (xForwardedFor) {
		return xForwardedFor.split(",")[0].trim();
	}
	const xRealIp = headers.get("x-real-ip");
	if (xRealIp) {
		return xRealIp.trim();
	}
	return "127.0.0.1";
}
