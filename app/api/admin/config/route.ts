import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import {
	getAdminConfigurations,
	createAdminConfiguration,
	updateAdminConfiguration,
	deleteAdminConfiguration,
} from "@/services/server/admin/admin.service";
import { handleApiError } from "@/lib/api-handler";
import * as apiResponse from "@/lib/api-response";
import { validateSchema } from "@/lib/validate";
import {
	CreateConfigSchema,
	UpdateConfigSchema,
	DeleteConfigSchema,
} from "@/validators/admin.validator";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders, logSecurityEvent } from "@/lib/audit-logger";

async function checkHRPermission() {
	const admin = await getCurrentAdmin();
	if (!admin || admin.role !== "hr") {
		return {
			authorized: false,
			errorResponse: apiResponse.forbidden("HR access required", "FORBIDDEN"),
		};
	}
	return { authorized: true, admin };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:config_get" });
	if (limiter.isBlocked) return limiter.response!;

	const auth = await checkHRPermission();
	if (!auth.authorized) return auth.errorResponse!;

	try {
		const result = await getAdminConfigurations();
		return apiResponse.success(result);
	} catch (err) {
		return handleApiError(err);
	}
}

export async function POST(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:config_post" });
	if (limiter.isBlocked) return limiter.response!;

	const auth = await checkHRPermission();
	if (!auth.authorized) return auth.errorResponse!;

	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(CreateConfigSchema, body);

		const result = await createAdminConfiguration(validated);

		logSecurityEvent({
			action: "admin_config_create",
			actor: { id: auth.admin?.userId, email: auth.admin?.email, role: auth.admin?.role, ip },
			targetId: result?.id,
			status: "success",
			details: { type: validated.type, label: validated.label }
		});

		return apiResponse.success(result, 201);
	} catch (err) {
		logSecurityEvent({
			action: "admin_config_create",
			actor: { id: auth.admin?.userId, email: auth.admin?.email, role: auth.admin?.role, ip },
			status: "failure",
			details: { error: err instanceof Error ? err.message : String(err) }
		});
		return handleApiError(err);
	}
}

export async function PUT(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:config_put" });
	if (limiter.isBlocked) return limiter.response!;

	const auth = await checkHRPermission();
	if (!auth.authorized) return auth.errorResponse!;

	try {
		const body = await request.json().catch(() => null);
		const validated = validateSchema(UpdateConfigSchema, body);

		const result = await updateAdminConfiguration(validated);

		logSecurityEvent({
			action: "admin_config_update",
			actor: { id: auth.admin?.userId, email: auth.admin?.email, role: auth.admin?.role, ip },
			targetId: validated.id,
			status: "success",
			details: { id: validated.id, isVacancy: validated.isVacancy }
		});

		return apiResponse.success(result);
	} catch (err) {
		logSecurityEvent({
			action: "admin_config_update",
			actor: { id: auth.admin?.userId, email: auth.admin?.email, role: auth.admin?.role, ip },
			status: "failure",
			details: { error: err instanceof Error ? err.message : String(err) }
		});
		return handleApiError(err);
	}
}

export async function DELETE(request: NextRequest) {
	const ip = getClientIpFromHeaders(request.headers);
	const limiter = rateLimit(ip, { limit: 60, windowMs: 60000, keyPrefix: "rl:config_delete" });
	if (limiter.isBlocked) return limiter.response!;

	const auth = await checkHRPermission();
	if (!auth.authorized) return auth.errorResponse!;

	try {
		const { searchParams } = new URL(request.url);
		const query = validateSchema(DeleteConfigSchema, {
			id: searchParams.get("id"),
			isVacancy: searchParams.get("isVacancy"),
			type: searchParams.get("type") || undefined,
		});

		await deleteAdminConfiguration(query.id, query.isVacancy, query.type);

		logSecurityEvent({
			action: "admin_config_delete",
			actor: { id: auth.admin?.userId, email: auth.admin?.email, role: auth.admin?.role, ip },
			targetId: query.id,
			status: "success",
			details: { id: query.id, isVacancy: query.isVacancy, type: query.type }
		});

		return apiResponse.success({ success: true });
	} catch (err) {
		logSecurityEvent({
			action: "admin_config_delete",
			actor: { id: auth.admin?.userId, email: auth.admin?.email, role: auth.admin?.role, ip },
			status: "failure",
			details: { error: err instanceof Error ? err.message : String(err) }
		});
		return handleApiError(err);
	}
}
