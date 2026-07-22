/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export function success<T = any>(data: T, status: number = 200) {
	return NextResponse.json(
		{
			success: true,
			data,
		},
		{ status }
	);
}

export function created<T = any>(data: T) {
	return success(data, 201);
}

export function error(message: string, code: string, status: number) {
	return NextResponse.json(
		{
			success: false,
			error: {
				message,
				code,
			},
		},
		{ status }
	);
}

export function badRequest(message: string = "Bad Request", code: string = "BAD_REQUEST") {
	return error(message, code, 400);
}

export function unauthorized(message: string = "Unauthorized", code: string = "UNAUTHORIZED") {
	return error(message, code, 401);
}

export function forbidden(message: string = "Forbidden", code: string = "FORBIDDEN") {
	return error(message, code, 403);
}

export function notFound(message: string = "Not Found", code: string = "NOT_FOUND") {
	return error(message, code, 404);
}

export function conflict(message: string = "Conflict", code: string = "CONFLICT") {
	return error(message, code, 409);
}

export function unprocessableEntity(message: string = "Unprocessable Entity", code: string = "UNPROCESSABLE_ENTITY") {
	return error(message, code, 422);
}

export function serverError(message: string = "Internal Server Error", code: string = "INTERNAL_SERVER_ERROR") {
	return error(message, code, 500);
}
