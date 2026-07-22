export abstract class AppError extends Error {
	abstract readonly status: number;

	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class ValidationError extends AppError {
	readonly status = 400;
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

export class AuthenticationError extends AppError {
	readonly status = 401;
	constructor(message: string) {
		super(message);
		this.name = "AuthenticationError";
	}
}

export class AuthorizationError extends AppError {
	readonly status = 403;
	constructor(message: string) {
		super(message);
		this.name = "AuthorizationError";
	}
}

export class NotFoundError extends AppError {
	readonly status = 404;
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export class ConflictError extends AppError {
	readonly status = 409;
	constructor(message: string) {
		super(message);
		this.name = "ConflictError";
	}
}

export class DatabaseError extends AppError {
	readonly status = 500;
	constructor(message: string) {
		super(message);
		this.name = "DatabaseError";
	}
}

export class InternalServerError extends AppError {
	readonly status = 500;
	constructor(message: string) {
		super(message);
		this.name = "InternalServerError";
	}
}
