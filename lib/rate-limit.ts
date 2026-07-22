import { NextResponse } from "next/server";

interface RateLimitTracker {
	count: number;
	resetTime: number;
}

// Memory-backed rate limit cache
const cache = new Map<string, RateLimitTracker>();

export interface RateLimitOptions {
	limit?: number; // max requests within windowMs
	windowMs?: number; // window size in milliseconds
	keyPrefix?: string; // namespace prefix
}

export function rateLimit(
	ip: string,
	options: RateLimitOptions = {}
): { isBlocked: boolean; remaining: number; reset: number; response?: NextResponse } {
	const limit = options.limit || 60;
	const windowMs = options.windowMs || 60000;
	const keyPrefix = options.keyPrefix || "rl";
	const key = `${keyPrefix}:${ip}`;

	const now = Date.now();
	let tracker = cache.get(key);

	if (!tracker) {
		tracker = { count: 1, resetTime: now + windowMs };
		cache.set(key, tracker);
		return { isBlocked: false, remaining: limit - 1, reset: tracker.resetTime };
	}

	if (now > tracker.resetTime) {
		tracker.count = 1;
		tracker.resetTime = now + windowMs;
		cache.set(key, tracker);
		return { isBlocked: false, remaining: limit - 1, reset: tracker.resetTime };
	}

	tracker.count++;
	cache.set(key, tracker);

	if (tracker.count > limit) {
		const retryAfter = Math.ceil((tracker.resetTime - now) / 1000);
		const response = NextResponse.json(
			{
				success: false,
				error: {
					message: `Too many requests. Please try again in ${retryAfter} seconds.`,
					code: "TOO_MANY_REQUESTS",
				},
			},
			{
				status: 429,
				headers: {
					"Retry-After": String(retryAfter),
				},
			}
		);
		return { isBlocked: true, remaining: 0, reset: tracker.resetTime, response };
	}

	return { isBlocked: false, remaining: limit - tracker.count, reset: tracker.resetTime };
}
