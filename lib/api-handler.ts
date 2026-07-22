import { AppError } from "./errors";
import * as apiResponse from "./api-response";
import { logger } from "./logger";

export function handleApiError(error: unknown, fallbackMessage = "An unexpected error occurred") {
	if (error instanceof AppError) {
		const message = error.message;
		switch (error.status) {
			case 400:
				return apiResponse.badRequest(message);
			case 401:
				return apiResponse.unauthorized(message);
			case 403:
				return apiResponse.forbidden(message);
			case 404:
				return apiResponse.notFound(message);
			case 409:
				return apiResponse.conflict(message);
			default:
				return apiResponse.serverError(message);
		}
	}

	const message = error instanceof Error ? error.message : fallbackMessage;
	logger.error("API handler caught unexpected error", { error: error instanceof Error ? error.message : String(error) });
	return apiResponse.serverError(message);
}
