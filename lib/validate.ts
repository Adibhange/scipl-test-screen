import { z } from "zod";
import { ValidationError } from "./errors";

export function validateSchema<T>(schema: z.Schema<T>, data: unknown): T {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		const errorMessages = parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
		throw new ValidationError(`Validation failed: ${errorMessages}`);
	}
	return parsed.data;
}
