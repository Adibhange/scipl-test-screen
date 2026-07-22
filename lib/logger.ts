/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "@/env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: Record<string, any>;
}

const sensitiveKeys = ["password", "token", "secret", "key", "credential", "auth", "cookie"];

function sanitize(data: any): any {
	if (!data) return data;
	if (typeof data !== "object") return data;

	if (Array.isArray(data)) {
		return data.map(sanitize);
	}

	const sanitized: Record<string, any> = {};
	for (const key of Object.keys(data)) {
		const lowerKey = key.toLowerCase();
		if (sensitiveKeys.some(k => lowerKey.includes(k))) {
			sanitized[key] = "[REDACTED]";
		} else {
			sanitized[key] = sanitize(data[key]);
		}
	}
	return sanitized;
}

function writeLog(level: LogLevel, message: string, context?: Record<string, any>) {
	const isProd = env.NODE_ENV === "production";
	const now = new Date().toISOString();
	const sanitizedContext = context ? sanitize(context) : undefined;

	if (isProd) {
		const payload: LogPayload = {
			timestamp: now,
			level,
			message,
			context: sanitizedContext,
		};
		console.log(JSON.stringify(payload));
	} else {
		const colorMap: Record<LogLevel, string> = {
			debug: "\x1b[36mDEBUG\x1b[0m",
			info: "\x1b[32mINFO\x1b[0m",
			warn: "\x1b[33mWARN\x1b[0m",
			error: "\x1b[31mERROR\x1b[0m",
		};
		const levelTag = colorMap[level];
		if (sanitizedContext) {
			console.log(`[${now}] ${levelTag}: ${message}`, sanitizedContext);
		} else {
			console.log(`[${now}] ${levelTag}: ${message}`);
		}
	}
}

export const logger = {
	debug(message: string, context?: Record<string, any>) {
		if (env.NODE_ENV !== "production") {
			writeLog("debug", message, context);
		}
	},
	info(message: string, context?: Record<string, any>) {
		writeLog("info", message, context);
	},
	warn(message: string, context?: Record<string, any>) {
		writeLog("warn", message, context);
	},
	error(message: string, context?: Record<string, any>) {
		writeLog("error", message, context);
	},
};
