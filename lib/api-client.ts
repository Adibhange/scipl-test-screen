/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RequestOptions {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	headers?: Record<string, string>;
	body?: any;
	queryParams?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
	status: number;
	data: any;

	constructor(message: string, status: number, data?: any) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.data = data;
	}
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
	const method = options.method || "GET";
	let url = path;

	if (options.queryParams) {
		const params = new URLSearchParams();
		Object.entries(options.queryParams).forEach(([key, val]) => {
			if (val !== undefined) {
				params.append(key, String(val));
			}
		});
		const queryString = params.toString();
		if (queryString) {
			url += (url.includes("?") ? "&" : "?") + queryString;
		}
	}

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...options.headers,
	};

	const fetchOptions: RequestInit = {
		method,
		headers,
	};

	if (options.body !== undefined) {
		fetchOptions.body = JSON.stringify(options.body);
	}

	const response = await fetch(url, fetchOptions);

	let data: any = null;
	const contentType = response.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		data = await response.json().catch(() => null);
	} else {
		const text = await response.text().catch(() => "");
		if (text) data = { message: text };
	}

	if (!response.ok || (data && typeof data === "object" && data.success === false)) {
		const errMsg = data?.error?.message || data?.error || data?.message || `HTTP error! status: ${response.status}`;
		throw new ApiError(errMsg, response.status, data);
	}

	if (data && typeof data === "object" && "success" in data && data.success === true && "data" in data) {
		return data.data as T;
	}

	return data as T;
}
