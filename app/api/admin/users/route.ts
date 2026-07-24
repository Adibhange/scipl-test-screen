import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import {
	getAdminRoster,
	createAdminAccount,
	updateAdminProfile,
	updateAdminAccount,
} from "@/services/server/admin/admin.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import {
	CreateAdminUserSchema,
	UpdateAdminProfileSchema,
	UpdateAdminUserSchema,
} from "@/validators/admin.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:users_get" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin) {
		return apiResponse.unauthorized("Authentication required", "UNAUTHORIZED");
	}
	
	try {
		const users = await getAdminRoster();
		return apiResponse.success(users);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:users_post" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin || admin.role !== "hr") {
		return apiResponse.forbidden("HR access required", "FORBIDDEN");
	}

	let targetEmail = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(CreateAdminUserSchema, body);
		targetEmail = validated.email;

		const data = await createAdminAccount(validated);

		logSecurityEvent({
			action: "admin_user_create",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: data?.user_id || undefined,
			status: "success",
			details: { email: validated.email, role: validated.role, name: validated.name }
		});

		return apiResponse.created(data);
	} catch (error) {
		logSecurityEvent({
			action: "admin_user_create",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			status: "failure",
			details: { email: targetEmail || undefined, error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}

export async function PUT(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:users_put" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin) {
		return apiResponse.unauthorized("Authentication required", "UNAUTHORIZED");
	}

	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(UpdateAdminProfileSchema, body);

		await updateAdminProfile(admin.userId, {
			name: validated.name,
			email: validated.email,
			password: validated.password,
			pin: validated.pin,
			adminEmail: admin.email,
		});

		logSecurityEvent({
			action: "admin_profile_update",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: admin.userId,
			status: "success",
			details: { email: validated.email, name: validated.name }
		});

		return apiResponse.success({ message: "Profile updated" });
	} catch (error) {
		logSecurityEvent({
			action: "admin_profile_update",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: admin.userId,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}

export async function PATCH(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 30, windowMs: 60000, keyPrefix: "rl:users_patch" });
	if (limiter.isBlocked) return limiter.response!;

	const admin = await getCurrentAdmin();
	if (!admin || !["hr", "director"].includes(admin.role)) {
		return apiResponse.forbidden("HR or Director access required", "FORBIDDEN");
	}

	let targetUserId = "";
	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(UpdateAdminUserSchema, body);
		targetUserId = validated.userId;

		await updateAdminAccount(validated.userId, validated);

		logSecurityEvent({
			action: "admin_account_edit",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: validated.userId,
			status: "success",
			details: { email: validated.email, name: validated.name, role: validated.role }
		});

		return apiResponse.success({ message: "User updated" });
	} catch (error) {
		logSecurityEvent({
			action: "admin_account_edit",
			actor: { id: admin.userId, email: admin.email, role: admin.role, ip },
			targetId: targetUserId || undefined,
			status: "failure",
			details: { error: error instanceof Error ? error.message : String(error) }
		});
		return handleApiError(error);
	}
}
