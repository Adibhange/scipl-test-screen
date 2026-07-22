import { z } from "zod";

const serverSchema = z.object({
	DATABASE_PROVIDER: z.string().default("supabase"),
	DATABASE_URL: z.string().optional().or(z.literal("")),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required on server"),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
	NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
});

const isServer = typeof window === "undefined";

// Selectively validate based on runtime boundary
const serverEnvResult = isServer
	? serverSchema.safeParse({
			DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
			DATABASE_URL: process.env.DATABASE_URL,
			SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
			NODE_ENV: process.env.NODE_ENV,
	  })
	: null;

const clientEnvResult = clientSchema.safeParse({
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (isServer && serverEnvResult && !serverEnvResult.success) {
	console.error("Invalid server environment variables:", serverEnvResult.error.format());
	throw new Error("Invalid server environment variables");
}

if (!clientEnvResult.success) {
	console.error("Invalid client environment variables:", clientEnvResult.error.format());
	throw new Error("Invalid client environment variables");
}

export const env = {
	...(isServer && serverEnvResult ? serverEnvResult.data : {}),
	...clientEnvResult.data,
} as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;
