import { env } from "@/env";
import { supabaseAdapter } from "./adapters/supabase";
import { prismaAdapter } from "./adapters/prisma";
import type { IDatabaseAdapter } from "./types";

/**
 * Returns the currently active database adapter instance.
 * Defaults to "supabase". Future switches will resolve to "prisma".
 */
export function getDatabaseAdapter(): IDatabaseAdapter {
	const provider = env.DATABASE_PROVIDER || "supabase";
	if (provider === "prisma") {
		return prismaAdapter;
	}
	return supabaseAdapter;
}
